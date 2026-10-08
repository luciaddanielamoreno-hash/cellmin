from fastapi import APIRouter, Depends, HTTPException
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

    # 1. Validar el tipo y la cantidad (el ajuste sí puede ser 0)
    if movement.tipo not in ("entrada", "salida", "ajuste"):
        raise HTTPException(status_code=400, detail="Tipo de movimiento inválido")
    if movement.tipo == "ajuste":
        if movement.cantidad < 0:
            raise HTTPException(status_code=400, detail="El stock no puede ser negativo")
    elif movement.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")

    # 2. Buscar el producto y su stock actual
    producto = await db.productos.find_one({"_id": ObjectId(movement.producto_id)})
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if movement.variante_nombre:
        variante = next(
            (v for v in producto.get("variantes", []) if v["nombre"] == movement.variante_nombre),
            None,
        )
        if not variante:
            raise HTTPException(status_code=404, detail="Variante no encontrada")
        stock_actual = variante.get("stock_actual", 0)
    else:
        stock_actual = producto.get("stock_actual", 0)

    # 3. Calcular el stock nuevo (una salida no puede dejarlo negativo)
    if movement.tipo == "entrada":
        nuevo_stock = stock_actual + movement.cantidad
    elif movement.tipo == "salida":
        if movement.cantidad > stock_actual:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente. Disponible: {stock_actual}, a restar: {movement.cantidad}",
            )
        nuevo_stock = stock_actual - movement.cantidad
    else:  # ajuste: la cantidad es el stock final
        nuevo_stock = movement.cantidad

    # 4. Actualizar el stock
    if movement.variante_nombre:
        await db.productos.update_one(
            {"_id": ObjectId(movement.producto_id), "variantes.nombre": movement.variante_nombre},
            {"$set": {"variantes.$.stock_actual": nuevo_stock}},
        )
    else:
        await db.productos.update_one(
            {"_id": ObjectId(movement.producto_id)},
            {"$set": {"stock_actual": nuevo_stock}},
        )

    # 5. Recién ahora registrar el movimiento en el historial
    await db.stock_movimientos.insert_one({
        **movement.dict(),
        "usuario_id": current_user["user_id"],
        "fecha": datetime.utcnow(),
    })

    return {"message": "Movimiento registrado correctamente"}