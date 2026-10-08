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

@router.post("/")
async def create_sale(sale: SaleCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "ventas:create")
    db = get_db()

    # 1. Validar stock ANTES de escribir nada (suma cantidades si el producto se repite)
    pedidos = {}
    for item in sale.items:
        clave = (item.producto_id, item.variante_nombre)
        pedidos[clave] = pedidos.get(clave, 0) + item.cantidad

    for (producto_id, variante_nombre), cantidad in pedidos.items():
        producto = await db.productos.find_one({"_id": ObjectId(producto_id)})
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        if variante_nombre:
            variante = next(
                (v for v in producto.get("variantes", []) if v["nombre"] == variante_nombre),
                None,
            )
            if not variante:
                raise HTTPException(status_code=404, detail=f"Variante '{variante_nombre}' no encontrada")
            stock_disponible = variante.get("stock_actual", 0)
            nombre = f"{producto['nombre']} — {variante_nombre}"
        else:
            stock_disponible = producto.get("stock_actual", 0)
            nombre = producto["nombre"]

        if cantidad > stock_disponible:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{nombre}'. Disponible: {stock_disponible}, solicitado: {cantidad}",
            )

    # 2. Registrar la venta
    numero = await get_next_number(db, "ventas", "V-")
    new_sale = {
        **sale.dict(),
        "numero_venta": numero,
        "estado": "completada",
        "usuario_id": current_user["user_id"],
        "fecha": datetime.utcnow(),
    }
    result = await db.ventas.insert_one(new_sale)

    # 3. Descontar stock y registrar movimientos
    for item in sale.items:
        await db.stock_movimientos.insert_one({
            "producto_id": item.producto_id,
            "variante_nombre": item.variante_nombre,
            "tipo": "salida",
            "cantidad": item.cantidad,
            "motivo": "venta",
            "referencia_id": str(result.inserted_id),
            "usuario_id": current_user["user_id"],
            "fecha": datetime.utcnow(),
        })
        if item.variante_nombre:
            await db.productos.update_one(
                {"_id": ObjectId(item.producto_id), "variantes.nombre": item.variante_nombre},
                {"$inc": {"variantes.$.stock_actual": -item.cantidad}},
            )
        else:
            await db.productos.update_one(
                {"_id": ObjectId(item.producto_id)},
                {"$inc": {"stock_actual": -item.cantidad}},
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

    return {"message": "Venta registrada", "numero_venta": numero, "id": str(result.inserted_id)}


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