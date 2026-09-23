from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.client import ClientCreate, ClientUpdate
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime

router = APIRouter()

def format_client(c):
    return {
        "id": str(c["_id"]),
        "nombre": c["nombre"],
        "apellido": c.get("apellido"),
        "dni": c.get("dni"),
        "telefono": c.get("telefono"),
        "email": c.get("email"),
        "direccion": c.get("direccion"),
        "activo": c.get("activo", True),
        "fecha_creacion": c.get("fecha_creacion")
    }

@router.get("/")
async def get_clients(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user["role"] == "administrador":
        clients = await db.clientes.find().to_list(500)
    else:
        clients = await db.clientes.find({"activo": True}).to_list(500)
    return [format_client(c) for c in clients]

@router.get("/{client_id}")
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    client = await db.clientes.find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return format_client(client)

@router.post("/")
async def create_client(client: ClientCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "clientes:create")
    db = get_db()
    if client.dni:
        existing = await db.clientes.find_one({"dni": client.dni})
        if existing:
            raise HTTPException(status_code=400, detail=f"Ya existe un cliente con el DNI {client.dni}")
    new_client = {
        **client.dict(),
        "activo": True,
        "fecha_creacion": datetime.utcnow()
    }
    result = await db.clientes.insert_one(new_client)
    new_client["_id"] = result.inserted_id
    return format_client(new_client)

@router.put("/{client_id}")
async def update_client(client_id: str, client: ClientUpdate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "clientes:create")
    db = get_db()
    if client.dni:
        existing = await db.clientes.find_one({
            "dni": client.dni,
            "_id": {"$ne": ObjectId(client_id)}
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Ya existe un cliente con el DNI {client.dni}")
    update_data = {k: v for k, v in client.dict().items() if v is not None}
    await db.clientes.update_one({"_id": ObjectId(client_id)}, {"$set": update_data})
    updated = await db.clientes.find_one({"_id": ObjectId(client_id)})
    return format_client(updated)

@router.delete("/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    cliente = await db.clientes.find_one({"_id": ObjectId(client_id)})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    nuevo_estado = not cliente.get("activo", True)
    await db.clientes.update_one({"_id": ObjectId(client_id)}, {"$set": {"activo": nuevo_estado}})
    return {"message": f"Cliente {'activado' if nuevo_estado else 'desactivado'} correctamente"}

@router.delete("/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    await db.clientes.update_one({"_id": ObjectId(client_id)}, {"$set": {"activo": False}})
    return {"message": "Cliente eliminado correctamente"}