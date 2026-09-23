from fastapi import APIRouter, Depends, Request
from app.database import get_db
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from datetime import datetime
from bson import ObjectId

router = APIRouter()

async def registrar_auditoria(
    db,
    usuario_id: str,
    usuario_nombre: str,
    rol: str,
    accion: str,
    modulo: str,
    descripcion: str,
    dato_anterior=None,
    dato_nuevo=None,
):
    log = {
        "usuario_id": usuario_id,
        "usuario_nombre": usuario_nombre,
        "rol": rol,
        "accion": accion,
        "modulo": modulo,
        "descripcion": descripcion,
        "dato_anterior": dato_anterior,
        "dato_nuevo": dato_nuevo,
        "fecha": datetime.utcnow()
    }
    await db.auditoria.insert_one(log)

@router.get("/")
async def get_audit_logs(
    modulo: str = None,
    accion: str = None,
    usuario_id: str = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    check_permission(current_user["role"], "*")
    db = get_db()
    filtro = {}
    if modulo:
        filtro["modulo"] = modulo
    if accion:
        filtro["accion"] = accion
    if usuario_id:
        filtro["usuario_id"] = usuario_id
    logs = await db.auditoria.find(filtro).sort("fecha", -1).to_list(limit)
    return [{**log, "_id": str(log["_id"])} for log in logs]