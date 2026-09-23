from fastapi import APIRouter, Depends
from app.database import get_db
from app.models.purchase import PurchaseCreate
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime

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