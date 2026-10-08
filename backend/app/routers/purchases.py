from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from app.routers.audit import registrar_auditoria
from bson import ObjectId
from datetime import datetime
from app.models.purchase import PurchaseCreate


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
async def get_purchases(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    purchases = await db.compras.find().sort("fecha", -1).to_list(500)
    return [{**p, "_id": str(p["_id"])} for p in purchases]

@router.post("/")
async def create_purchase(purchase: PurchaseCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    numero = await get_next_number(db, "compras", "C-")
    new_purchase = {
        **purchase.dict(),
        "numero_compra": numero,
        "usuario_id": current_user["user_id"],
        "fecha": datetime.utcnow()
    }
    result = await db.compras.insert_one(new_purchase)
    # Actualizar stock por cada item
    for item in purchase.items:
        await db.stock_movimientos.insert_one({
            "producto_id": item.producto_id,
            "variante_nombre": item.variante_nombre,
            "tipo": "entrada",
            "cantidad": item.cantidad,
            "motivo": "compra",
            "referencia_id": str(result.inserted_id),
            "usuario_id": current_user["user_id"],
            "fecha": datetime.utcnow()
        })
        if item.variante_nombre:
            producto = await db.productos.find_one({"_id": ObjectId(item.producto_id)})
            variantes = producto.get("variantes", [])
            for v in variantes:
                if v["nombre"] == item.variante_nombre:
                    v["stock_actual"] = v.get("stock_actual", 0) + item.cantidad
            await db.productos.update_one(
                {"_id": ObjectId(item.producto_id)},
                {"$set": {"variantes": variantes}}
            )
        else:
            await db.productos.update_one(
                {"_id": ObjectId(item.producto_id)},
                {"$inc": {"stock_actual": item.cantidad}}
            )
    return {"message": "Compra registrada", "numero_compra": numero, "id": str(result.inserted_id)}

@router.put("/{purchase_id}/cancelar")
async def cancel_purchase(purchase_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "compras:create")
    db = get_db()

    compra = await db.compras.find_one({"_id": ObjectId(purchase_id)})
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    if compra.get("estado", "completada") == "cancelada":
        raise HTTPException(status_code=400, detail="La compra ya está cancelada")

    # Primero verificamos que haya stock suficiente para revertir todos los ítems
    for item in compra.get("items", []):
        producto = await db.productos.find_one({"_id": ObjectId(item["producto_id"])})
        if not producto:
            continue
        if item.get("variante_nombre"):
            variante = next(
                (v for v in producto.get("variantes", []) if v["nombre"] == item["variante_nombre"]),
                None,
            )
            stock_actual = variante.get("stock_actual", 0) if variante else 0
        else:
            stock_actual = producto.get("stock_actual", 0)
        if stock_actual < item["cantidad"]:
            raise HTTPException(
                status_code=400,
                detail=f"No hay stock suficiente para revertir '{item['nombre_producto']}'. Stock actual: {stock_actual}, a restar: {item['cantidad']}",
            )

    # Si todo está bien, restamos el stock y registramos los movimientos
    for item in compra.get("items", []):
        if item.get("variante_nombre"):
            await db.productos.update_one(
                {"_id": ObjectId(item["producto_id"]), "variantes.nombre": item["variante_nombre"]},
                {"$inc": {"variantes.$.stock_actual": -item["cantidad"]}},
            )
        else:
            await db.productos.update_one(
                {"_id": ObjectId(item["producto_id"])},
                {"$inc": {"stock_actual": -item["cantidad"]}},
            )
        await db.stock_movimientos.insert_one({
            "producto_id": item["producto_id"],
            "variante_nombre": item.get("variante_nombre"),
            "tipo": "salida",
            "cantidad": item["cantidad"],
            "motivo": "cancelacion_compra",
            "referencia_id": purchase_id,
            "notas": f"Cancelación de compra {compra.get('numero_compra', '')}",
            "usuario_id": current_user["user_id"],
            "fecha": datetime.utcnow(),
        })

    await db.compras.update_one(
        {"_id": ObjectId(purchase_id)},
        {"$set": {"estado": "cancelada", "fecha_cancelacion": datetime.utcnow()}},
    )

    await registrar_auditoria(
        db=db,
        usuario_id=current_user["user_id"],
        usuario_nombre="",
        rol=current_user["role"],
        accion="cancelar",
        modulo="compras",
        descripcion=f"Compra cancelada: {compra.get('numero_compra', '')}",
    )

    return {"message": "Compra cancelada y stock revertido"}