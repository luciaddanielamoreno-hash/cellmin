from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.sale import SaleCreate
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime
from app.utils.logger import registrar_auditoria
from app.utils.pagos import (
    METODOS_VALIDOS,
    USD,
    cotizacion_para_cobro,
    formato_usd,
    movimiento_vuelto,
    pagos_de_venta,
)

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
    #    Con medio "usd" el monto del pago es en dólares: se convierte a pesos
    #    con la cotización del servidor y la diferencia con el total es el
    #    vuelto, que se entrega en pesos.
    vuelto = 0.0
    cotizacion = None
    caja_cobro = None
    if sale.pagos:
        for p in sale.pagos:
            if p.metodo not in METODOS_VALIDOS:
                raise HTTPException(status_code=400, detail=f"Medio de pago inválido: {p.metodo}")
        usa_usd = any(p.metodo == USD for p in sale.pagos)
        if usa_usd:
            cotizacion = await cotizacion_para_cobro(db)
            caja_cobro = await db.cajas.find_one({"estado": "abierta", "sucursal": sale.sucursal})
            if not caja_cobro:
                raise HTTPException(
                    status_code=400,
                    detail="Para cobrar en dólares hace falta una caja abierta, donde se registran los billetes recibidos.",
                )

        if len(sale.pagos) == 1 and not usa_usd:
            metodo_pago = sale.pagos[0].metodo
            pagos_venta = [{"metodo": metodo_pago, "monto": total}]
        else:
            if any(p.monto <= 0 for p in sale.pagos):
                raise HTTPException(status_code=400, detail="Cada medio de pago debe tener un monto mayor a 0")
            pagos_venta = []
            for p in sale.pagos:
                if p.metodo == USD:
                    usd = redondear(p.monto)
                    pagos_venta.append({
                        "metodo": USD,
                        "monto": redondear(usd * cotizacion),
                        "usd": usd,
                        "cotizacion": cotizacion,
                    })
                else:
                    pagos_venta.append({"metodo": p.metodo, "monto": redondear(p.monto)})
            pagado = redondear(sum(p["monto"] for p in pagos_venta))

            if not usa_usd:
                if abs(pagado - total) > 0.01:
                    raise HTTPException(
                        status_code=400,
                        detail=f"El total pagado ({formato_monto(pagado)}) no coincide con el total ({formato_monto(total)})",
                    )
            else:
                if pagado < total - 0.01:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Lo recibido ({formato_monto(pagado)}) no alcanza para cubrir el total ({formato_monto(total)})",
                    )
                if pagado > total + 0.01:
                    vuelto = redondear(pagado - total)
                    en_efectivo = sum(p["monto"] for p in pagos_venta if p["metodo"] in ("efectivo", USD))
                    if vuelto > en_efectivo + 0.01:
                        raise HTTPException(
                            status_code=400,
                            detail="El vuelto solo puede salir de lo cobrado en efectivo o en dólares, no de tarjeta ni transferencia.",
                        )

            def texto_pago(p):
                if p["metodo"] == USD:
                    return f"usd: {formato_usd(p['usd'])}"
                return f"{p['metodo']}: {formato_monto(p['monto'])}"

            if len(pagos_venta) > 1:
                metodo_pago = " + ".join(texto_pago(p) for p in pagos_venta)
            else:
                metodo_pago = USD
    else:
        if sale.metodo_pago == USD:
            raise HTTPException(status_code=400, detail="Indicá cuántos dólares se recibieron")
        if sale.metodo_pago not in METODOS_VALIDOS:
            raise HTTPException(status_code=400, detail="Medio de pago inválido")
        metodo_pago = sale.metodo_pago
        pagos_venta = [{"metodo": metodo_pago, "monto": total}]

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
        "pagos": pagos_venta,
        "vuelto": vuelto,
        "cotizacion_usd": cotizacion,
        "sucursal": sale.sucursal,
        "notas": sale.notas,
        "numero_venta": numero,
        "estado": "completada",
        "usuario_id": current_user["user_id"],
        "fecha": datetime.utcnow(),
    }
    result = await db.ventas.insert_one(new_sale)

    # Vuelto en pesos entregado al cobrar en dólares: sale de la caja
    if vuelto > 0 and caja_cobro:
        await db.cajas.update_one(
            {"_id": caja_cobro["_id"]},
            {"$push": {"movimientos": movimiento_vuelto(
                vuelto, f"venta {numero}", str(result.inserted_id), current_user["user_id"]
            )}},
        )

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

    return {"message": "Venta registrada", "numero_venta": numero, "id": str(result.inserted_id), "total": total, "vuelto": vuelto}


@router.put("/{sale_id}/cancel")
async def cancel_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "ventas:cancel")
    db = get_db()
    try:
        oid = ObjectId(sale_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    sale = await db.ventas.find_one({"_id": oid})
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if sale["estado"] == "cancelada":
        raise HTTPException(status_code=400, detail="La venta ya está cancelada")

    # La devolución del dinero se registra en la caja abierta de hoy
    sucursal = current_user["sucursales"][0]
    caja = await db.cajas.find_one({"estado": "abierta", "sucursal": sucursal})
    if not caja:
        raise HTTPException(
            status_code=400,
            detail="Para cancelar una venta hace falta una caja abierta, donde se registra la devolución del dinero.",
        )

    # Solo se pueden cancelar ventas de la caja abierta: las de cajas ya
    # cerradas quedaron incluidas en un cierre y no se pueden modificar.
    if sale.get("sucursal") != caja.get("sucursal") or sale["fecha"] < caja["fecha_apertura"]:
        raise HTTPException(
            status_code=400,
            detail="Esta venta corresponde a una caja anterior (ya cerrada), por eso no se puede cancelar.",
        )

    # Marcar como cancelada solo si seguía completada (evita doble cancelación simultánea)
    resultado = await db.ventas.update_one(
        {"_id": oid, "estado": "completada"},
        {"$set": {
            "estado": "cancelada",
            "fecha_cancelacion": datetime.utcnow(),
            "cancelada_por": current_user["user_id"],
        }},
    )
    if resultado.modified_count == 0:
        raise HTTPException(status_code=400, detail="La venta ya está cancelada")

    numero = sale.get("numero_venta", "")

    # Devolver stock (producto base o variante) y registrar el movimiento
    for item in sale.get("items", []):
        variante = item.get("variante_nombre")
        await db.stock_movimientos.insert_one({
            "producto_id": item["producto_id"],
            "variante_nombre": variante,
            "tipo": "entrada",
            "cantidad": item["cantidad"],
            "motivo": "cancelacion_venta",
            "referencia_id": sale_id,
            "usuario_id": current_user["user_id"],
            "fecha": datetime.utcnow(),
        })
        if variante:
            await db.productos.update_one(
                {"_id": ObjectId(item["producto_id"]), "variantes.nombre": variante},
                {"$inc": {"variantes.$.stock_actual": item["cantidad"]}},
            )
        else:
            await db.productos.update_one(
                {"_id": ObjectId(item["producto_id"])},
                {"$inc": {"stock_actual": item["cantidad"]}},
            )

    # Devolver el dinero por el mismo medio con el que se cobró: lo cobrado
    # en dólares se descuenta del esperado en dólares. Si hubo vuelto en
    # pesos, se revierte (el cliente lo devuelve junto con los dólares).
    egresos = []
    for p in pagos_de_venta(sale):
        if p["monto"] <= 0:
            continue
        egreso = {
            "tipo": "egreso",
            "monto": p["monto"],
            "motivo": f"Cancelación venta {numero} — {p['metodo']}",
            "metodo_pago": p["metodo"],
            "concepto": "cancelacion_venta",
            "referencia_id": sale_id,
            "notas": f"Cancelación de la venta {numero}",
            "usuario_id": current_user["user_id"],
            "fecha": datetime.utcnow(),
        }
        if p["metodo"] == USD:
            egreso["monto_usd"] = p.get("usd")
        egresos.append(egreso)
    vuelto_entregado = sale.get("vuelto", 0) or 0
    if vuelto_entregado > 0:
        egresos.append({
            "tipo": "ingreso",
            "monto": vuelto_entregado,
            "motivo": f"Cancelación venta {numero} — vuelto devuelto",
            "metodo_pago": "efectivo",
            "concepto": "cancelacion_venta",
            "referencia_id": sale_id,
            "notas": f"Se revierte el vuelto en pesos de la venta {numero}",
            "usuario_id": current_user["user_id"],
            "fecha": datetime.utcnow(),
        })
    if egresos:
        await db.cajas.update_one({"_id": caja["_id"]}, {"$push": {"movimientos": {"$each": egresos}}})

    await registrar_auditoria(
        db=db,
        usuario_id=current_user["user_id"],
        usuario_nombre="",
        rol=current_user["role"],
        accion="cancelar",
        modulo="ventas",
        descripcion=f"Venta cancelada: {numero}. Devuelto: {sale['total']}",
    )

    return {"message": "Venta cancelada", "numero_venta": numero, "total_devuelto": sale["total"]}
