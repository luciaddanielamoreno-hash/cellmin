from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.supplier import SupplierCreate, SupplierUpdate
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime

router = APIRouter()

def format_supplier(s):
    return {
        "id": str(s["_id"]),
        "nombre": s["nombre"],
        "cuit": s.get("cuit"),
        "telefono": s.get("telefono"),
        "email": s.get("email"),
        "direccion": s.get("direccion"),
        "contacto": s.get("contacto"),
        "activo": s.get("activo", True),
        "fecha_creacion": s.get("fecha_creacion")
    }

@router.get("/")
async def get_suppliers(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user["role"] in ["administrador", "deposito"]:
        suppliers = await db.proveedores.find().to_list(200)
    else:
        suppliers = await db.proveedores.find({"activo": True}).to_list(200)
    return [format_supplier(s) for s in suppliers]

@router.get("/{supplier_id}")
async def get_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    supplier = await db.proveedores.find_one({"_id": ObjectId(supplier_id)})
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return format_supplier(supplier)

@router.post("/")
async def create_supplier(supplier: SupplierCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    existing = await db.proveedores.find_one({
        "nombre": {"$regex": f"^{supplier.nombre}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un proveedor con el nombre '{supplier.nombre}'")
    new_supplier = {
        **supplier.dict(),
        "activo": True,
        "fecha_creacion": datetime.utcnow()
    }
    result = await db.proveedores.insert_one(new_supplier)
    new_supplier["_id"] = result.inserted_id
    return format_supplier(new_supplier)

@router.put("/{supplier_id}")
async def update_supplier(supplier_id: str, supplier: SupplierUpdate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    if supplier.nombre:
        existing = await db.proveedores.find_one({
            "nombre": {"$regex": f"^{supplier.nombre}$", "$options": "i"},
            "_id": {"$ne": ObjectId(supplier_id)}
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Ya existe un proveedor con el nombre '{supplier.nombre}'")
    update_data = {k: v for k, v in supplier.dict().items() if v is not None}
    await db.proveedores.update_one({"_id": ObjectId(supplier_id)}, {"$set": update_data})
    updated = await db.proveedores.find_one({"_id": ObjectId(supplier_id)})
    return format_supplier(updated)

@router.delete("/{supplier_id}")
async def delete_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    proveedor = await db.proveedores.find_one({"_id": ObjectId(supplier_id)})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    nuevo_estado = not proveedor.get("activo", True)
    await db.proveedores.update_one({"_id": ObjectId(supplier_id)}, {"$set": {"activo": nuevo_estado}})
    return {"message": f"Proveedor {'activado' if nuevo_estado else 'desactivado'} correctamente"}