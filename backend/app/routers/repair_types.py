from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.repair_type import RepairTypeCreate, RepairTypeUpdate
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime

router = APIRouter()

def format_repair_type(r):
    return {
        "id": str(r["_id"]),
        "nombre": r["nombre"],
        "descripcion": r.get("descripcion"),
        "precio": r["precio"],
        "activo": r.get("activo", True)
    }

@router.get("/")
async def get_repair_types(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user["role"] in ["administrador", "tecnico"]:
        tipos = await db.tipos_reparacion.find().to_list(200)
    else:
        tipos = await db.tipos_reparacion.find({"activo": True}).to_list(200)
    return [format_repair_type(t) for t in tipos]

@router.post("/")
async def create_repair_type(tipo: RepairTypeCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    existing = await db.tipos_reparacion.find_one({
        "nombre": {"$regex": f"^{tipo.nombre}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un tipo de reparación con el nombre '{tipo.nombre}'")
    new_tipo = {
        **tipo.dict(),
        "fecha_creacion": datetime.utcnow()
    }
    result = await db.tipos_reparacion.insert_one(new_tipo)
    new_tipo["_id"] = result.inserted_id
    return format_repair_type(new_tipo)

@router.put("/{tipo_id}")
async def update_repair_type(tipo_id: str, tipo: RepairTypeUpdate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    if tipo.nombre:
        existing = await db.tipos_reparacion.find_one({
            "nombre": {"$regex": f"^{tipo.nombre}$", "$options": "i"},
            "_id": {"$ne": ObjectId(tipo_id)}
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Ya existe un tipo de reparación con el nombre '{tipo.nombre}'")
    update_data = {k: v for k, v in tipo.dict().items() if v is not None}
    await db.tipos_reparacion.update_one({"_id": ObjectId(tipo_id)}, {"$set": update_data})
    updated = await db.tipos_reparacion.find_one({"_id": ObjectId(tipo_id)})
    return format_repair_type(updated)

@router.delete("/{tipo_id}")
async def delete_repair_type(tipo_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    tipo = await db.tipos_reparacion.find_one({"_id": ObjectId(tipo_id)})
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de reparación no encontrado")
    nuevo_estado = not tipo.get("activo", True)
    await db.tipos_reparacion.update_one({"_id": ObjectId(tipo_id)}, {"$set": {"activo": nuevo_estado}})
    return {"message": f"Tipo de reparación {'activado' if nuevo_estado else 'desactivado'} correctamente"}