from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.sale import SaleCreate
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime
from app.routers.audit import registrar_auditoria

router = APIRouter()

async def get_next_number(db, collection: str, prefix: str) -> str:
    counter = await db.contadores.find_one_and_update(
        {"_id": collection},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return f"{prefix}{str(counter['seq']).zfill(4)}"

@router.get("/")
async def get_sales(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "ventas:read")
    db = get_db()
    sales = await db.ventas.find().sort("fecha", -1).to_list(500)
    return [{**s, "_id": str(s["_id"])} for s in sales]

@router.get("/{sale_id}")
async def get_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "ventas:read")
    db = get_db()
    if not ObjectId.is_valid(sale_id):
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    sale = await db.ventas.find_one({"_id": ObjectId(sale_id)})
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return {**sale, "_id": str(sale["_id"])}

METODOS_VALIDOS = ("efectivo", "transferencia", "debito", "credito")
TIPOS_AJUSTE = ("ninguno", "descuento", "interes")


def redondear(valor: float) -> float:
    return round(valor + 1e-9, 2)


def formato_monto(monto: float) -> str:
    # 10000.5 -> "$ 10.000,50" (mismo formato que usa el frontend)
    texto = f"{monto:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"$ {texto}"


@router.post("/")
async def create_sale(sale: SaleCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "ventas:create")
    db = get_db()

    # 1. Validaciones básicas del pedido
    if not sale.items:
        raise HTTPException(status_code=400, detail="La venta no tiene productos")
    if sale.tipo_ajuste not in TIPOS_AJUSTE:
        raise HTTPException(status_code=400, detail="Tipo de ajuste inválido")
    porcentaje = 0.0 if sale.tipo_ajuste == "ninguno" else sale.porcentaje_ajuste
    if porcentaje < 0 or porcentaje > 100:
        raise HTTPException(status_code=400, detail="El porcentaje debe estar entre 0 y 100")

    # 2. Tomar precios y nombres de la base de datos (nunca del frontend)
    #    y validar el stock ANTES de escribir nada
    productos = {}
    items_finales = []
    pedidos = {}  # (producto_id, variante) -> cantidad total pedida
    stock_por_clave = {}
    nombre_por_clave = {}

    for item in sale.items:
        if item.cantidad < 1:
            raise HTTPException(status_code=400, detail="La cantidad debe ser al menos 1")
        if not ObjectId.is_valid(item.producto_id):
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        if item.producto_id not in productos:
            productos[item.producto_id] = await db.productos.find_one({"_id": ObjectId(item.producto_id)})
        producto = productos[item.producto_id]
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        if not producto.get("activo", True):
            raise HTTPException(status_code=400, detail=f"'{producto['nombre']}' está inactivo")

        if item.variante_nombre:
            variante = next(
                (v for v in producto.get("variantes", []) if v["nombre"] == item.variante_nombre),
                None,
            )
            if not variante:
                raise HTTPException(status_code=404, detail=f"Variante '{item.variante_nombre}' no encontrada")
            precio = variante.get("precio_venta", 0)
            stock = variante.get("stock_actual", 0)
            nombre = f"{producto['nombre']} — {item.variante_nombre}"
        else:
            precio = producto.get("precio_venta", 0) or 0
            stock = producto.get("stock_actual", 0)
            nombre = producto["nombre"]

        clave = (item.producto_id, item.variante_nombre)
        pedidos[clave] = pedidos.get(clave, 0) + item.cantidad
        stock_por_clave[clave] = stock
        nombre_por_clave[clave] = nombre

        items_finales.append({
            "producto_id": item.producto_id,
            "variante_nombre": item.variante_nombre,
            "nombre_producto": nombre,
            "cantidad": item.cantidad,
            "precio_unitario": precio,
            "subtotal": redondear(precio * item.cantidad),
        })

    for clave, cantidad in pedidos.items():
        if cantidad > stock_por_clave[clave]:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{nombre_por_clave[clave]}'. Disponible: {stock_por_clave[clave]}, solicitado: {cantidad}",
            )

    # 3. Calcular totales en el servidor
    subtotal = redondear(sum(i["subtotal"] for i in items_finales))
    monto_ajuste = redondear(subtotal * porcentaje / 100)
    descuento = monto_ajuste if sale.tipo_ajuste == "descuento" else 0
    interes = monto_ajuste if sale.tipo_ajuste == "interes" else 0
    total = redondear(subtotal - descuento + interes)

    # Si los precios cambiaron mientras se armaba la venta, avisar en vez de cobrar otro monto
    if abs(total - sale.total) > 0.01:
        raise HTTPException(
            status_code=409,
            detail=f"El total cambió porque se actualizaron los precios. Total actual: {formato_monto(total)}. Revisá la venta y confirmá de nuevo.",
        )

    # 4. Validar el pago y armar el texto del medio de pago
    if sale.pagos:
        for p in sale.pagos:
            if p.metodo not in METODOS_VALIDOS:
                raise HTTPException(status_code=400, detail=f"Medio de pago inválido: {p.metodo}")
        if len(sale.pagos) > 1:
            if any(p.monto <= 0 for p in sale.pagos):
                raise HTTPException(status_code=400, detail="Cada medio de pago debe tener un monto mayor a 0")
            pagado = redondear(sum(p.monto for p in sale.pagos))
            if abs(pagado - total) > 0.01:
                raise HTTPException(
                    status_code=400,
                    detail=f"El total pagado ({formato_monto(pagado)}) no coincide con el total ({formato_monto(total)})",
                )
            metodo_pago = " + ".join(f"{p.metodo}: {formato_monto(p.monto)}" for p in sale.pagos)
        else:
            metodo_pago = sale.pagos[0].metodo
    else:
        if sale.metodo_pago not in METODOS_VALIDOS:
            raise HTTPException(status_code=400, detail="Medio de pago inválido")
        metodo_pago = sale.metodo_pago

    # 5. Registrar la venta
    numero = await get_next_number(db, "ventas", "V-")
    new_sale = {
        "cliente_id": sale.cliente_id,
        "items": items_finales,
        "subtotal": subtotal,
        "tipo_ajuste": sale.tipo_ajuste,
        "porcentaje_ajuste": porcentaje,
        "descuento": descuento,
        "interes": interes,
        "total": total,
        "metodo_pago": metodo_pago,
        "sucursal": sale.sucursal,
        "notas": sale.notas,
        "numero_venta": numero,
        "estado": "completada",
        "usuario_id": current_user["user_id"],
        "fecha": datetime.utcnow(),
    }
    result = await db.ventas.insert_one(new_sale)

    # 6. Descontar stock y registrar movimientos
    for item in items_finales:
        await db.stock_movimientos.insert_one({
            "producto_id": item["producto_id"],
            "variante_nombre": item["variante_nombre"],
            "tipo": "salida",
            "cantidad": item["cantidad"],
            "motivo": "venta",
            "referencia_id": str(result.inserted_id),
            "usuario_id": current_user["user_id"],
            "fecha": datetime.utcnow(),
        })
        if item["variante_nombre"]:
            await db.productos.update_one(
                {"_id": ObjectId(item["producto_id"]), "variantes.nombre": item["variante_nombre"]},
                {"$inc": {"variantes.$.stock_actual": -item["cantidad"]}},
            )
        else:
            await db.productos.update_one(
                {"_id": ObjectId(item["producto_id"])},
                {"$inc": {"stock_actual": -item["cantidad"]}},
            )

    await registrar_auditoria(
        db=db,
        usuario_id=current_user["user_id"],
        usuario_nombre="",
        rol=current_user["role"],
        accion="crear",
        modulo="ventas",
        descripcion=f"Venta registrada: {numero}",
    )

    return {"message": "Venta registrada", "numero_venta": numero, "id": str(result.inserted_id), "total": total}


@router.put("/{sale_id}/cancel")
async def cancel_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "ventas:cancel")
    db = get_db()
    sale = await db.ventas.find_one({"_id": ObjectId(sale_id)})
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if sale["estado"] == "cancelada":
        raise HTTPException(status_code=400, detail="La venta ya está cancelada")

    await db.ventas.update_one({"_id": ObjectId(sale_id)}, {"$set": {"estado": "cancelada"}})

    # Devolver stock (producto base o variante) y registrar