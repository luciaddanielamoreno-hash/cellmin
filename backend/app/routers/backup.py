from fastapi import APIRouter, Depends
from app.database import get_db
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from datetime import datetime
import json

router = APIRouter()

@router.get("/exportar")
async def export_backup(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    colecciones = [
        "usuarios", "categorias", "productos", "clientes",
        "proveedores", "ventas", "compras", "cajas",
        "reparaciones", "stock_movimientos"
    ]
    backup = {}
    for col in colecciones:
        docs = await db[col].find().to_list(10000)
        backup[col] = [{**d, "_id": str(d["_id"])} for d in docs]
    backup["fecha_backup"] = datetime.utcnow().isoformat()
    return backup