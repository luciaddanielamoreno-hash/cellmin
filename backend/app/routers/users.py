from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.user import UserCreate, UserUpdate
from app.utils.auth import get_current_user, hash_password
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime
from app.utils.logger import registrar_auditoria

router = APIRouter()

def format_user(user):
    return {
        "id": str(user["_id"]),
        "nombre": user["nombre"],
        "email": user["email"],
        "rol": user["rol"],
        "sucursales": user.get("sucursales", [user.get("sucursal", "sucursal_1")]),
        "activo": user.get("activo", True),
        "fecha_creacion": user.get("fecha_creacion")
    }

@router.get("/")
async def get_users(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    users = await db.usuarios.find().to_list(100)
    return [format_user(u) for u in users]

@router.post("/")
async def create_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    existing = await db.usuarios.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    new_user = {
        "nombre": user.nombre,
        "email": user.email,
        "password": hash_password(user.password),
        "rol": user.rol,
        "activo": True,
        "fecha_creacion": datetime.utcnow()
    }
    result = await db.usuarios.insert_one(new_user)
    new_user["_id"] = result.inserted_id

    await registrar_auditoria(
    db=db,
    usuario_id=current_user["user_id"],
    usuario_nombre="",
    rol=current_user["role"],
    accion="crear",
    modulo="usuarios",
    descripcion=f"Usuario creado: {user.email} — Rol: {user.rol}"
    )

    return format_user(new_user)

@router.put("/{user_id}")
async def update_user(user_id: str, user: UserUpdate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    update_data = {k: v for k, v in user.dict().items() if v is not None}
    if "password" in update_data:
        update_data["password"] = hash_password(update_data["password"])
    await db.usuarios.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    updated = await db.usuarios.find_one({"_id": ObjectId(user_id)})

    await registrar_auditoria(
    db=db,
    usuario_id=current_user["user_id"],
    usuario_nombre="",
    rol=current_user["role"],
    accion="actualizar",
    modulo="usuarios",
    descripcion=f"Usuario actualizado: {user_id}"
    )

    return format_user(updated)

@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    usuario = await db.usuarios.find_one({"_id": ObjectId(user_id)})
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    nuevo_estado = not usuario.get("activo", True)
    await db.usuarios.update_one({"_id": ObjectId(user_id)}, {"$set": {"activo": nuevo_estado}})

    await registrar_auditoria(
    db=db,
    usuario_id=current_user["user_id"],
    usuario_nombre="",
    rol=current_user["role"],
    accion="activar_desactivar",
    modulo="usuarios",
    descripcion=f"Usuario {'desactivado' if not nuevo_estado else 'activado'}: {user_id}"
    )

    return {"message": f"Usuario {'activado' if nuevo_estado else 'desactivado'} correctamente"}