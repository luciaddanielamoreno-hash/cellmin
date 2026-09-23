from fastapi import APIRouter, Depends
from app.database import get_db
from app.models.stock import StockMovement
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.get("/")
async def get_stock(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "stock:read")
    db = get_db()
    movements = await db.stock_movimientos.find().sort("fecha", -1).to_list(500)
    return [{**m, "_id": str(m["_id"])} for m in movements]

@router.get("/productos")
async def get_stock_productos(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "stock:read")
    db = get_db()
    products = await db.productos.find({"activo": True}).to_list(1000)
    result = []
    for p in products:
        result.append({
            "id": str(p["_id"]),
            "nombre": p["nombre"],
            "tiene_variantes": p.get("tiene_variantes", False),
            "variantes": p.get("variantes", []),
            "stock_actual": p.get("stock_actual", 0),
            "stock_minimo": p.get("stock_minimo", 0),
            "alerta": p.get("stock_actual", 0) < p.get("stock_minimo", 0)
        })
    return result

@router.post("/movimiento")
async def create_movement(movement: StockMovement, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "stock:create")
    db = get_db()
    new_movement = {
        **movement.dict(),
        "usuario_id": current_user["user_id"],
        "fecha": datetime.utcnow()
    }
    await db.stock_movimientos.insert_one(new_movement)

    producto = await db.productos.find_one({"_id": ObjectId(movement.producto_id)})
    if producto:
        if movement.variante_nombre:
            variantes = producto.get("variantes", [])
            for v in variantes:
                if v["nombre"] == movement.variante_nombre:
                    if movement.tipo == "entrada":
                        v["stock_actual"] = v.get("stock_actual", 0) + movement.cantidad
                    elif movement.tipo == "salida":
                        v["stock_actual"] = v.get("stock_actual", 0) - movement.cantidad
                    elif movement.tipo == "ajuste":
                        v["stock_actual"] = movement.cantidad
            await db.productos.update_one(
                {"_id": ObjectId(movement.producto_id)},
                {"$set": {"variantes": variantes}}
            )
        else:
            if movement.tipo == "entrada":
                await db.productos.update_one(
                    {"_id": ObjectId(movement.producto_id)},
                    {"$inc": {"stock_actual": movement.cantidad}}
                )
            elif movement.tipo == "salida":
                await db.productos.update_one(
                    {"_id": ObjectId(movement.producto_id)},
                    {"$inc": {"stock_actual": -movement.cantidad}}
                )
            elif movement.tipo == "ajuste":
                await db.productos.update_one(
                    {"_id": ObjectId(movement.producto_id)},
                    {"$set": {"stock_actual": movement.cantidad}}
                )

    return {"message": "Movimiento registrado correctamente"}