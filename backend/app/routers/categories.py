from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.category import CategoryCreate, CategoryUpdate
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime

router = APIRouter()

def format_cat(c):
    return {
        "id": str(c["_id"]),
        "nombre": c["nombre"],
        "descripcion": c.get("descripcion"),
        "categoria_padre_id": c.get("categoria_padre_id"),
        "activo": c.get("activo", True)
    }

@router.get("/")
async def get_categories(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user["role"] in ["administrador", "deposito"]:
        cats = await db.categorias.find().to_list(200)
    else:
        cats = await db.categorias.find({"activo": True}).to_list(200)
    return [format_cat(c) for c in cats]

@router.post("/")
async def create_category(cat: CategoryCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    existing = await db.categorias.find_one({
        "nombre": {"$regex": f"^{cat.nombre}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe una categoría con el nombre '{cat.nombre}'")
    new_cat = {
        **cat.dict(),
        "activo": True,
        "fecha_creacion": datetime.utcnow()
    }
    result = await db.categorias.insert_one(new_cat)
    new_cat["_id"] = result.inserted_id
    return format_cat(new_cat)

@router.put("/{cat_id}")
async def update_category(cat_id: str, cat: CategoryUpdate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    if cat.nombre:
        existing = await db.categorias.find_one({
            "nombre": {"$regex": f"^{cat.nombre}$", "$options": "i"},
            "_id": {"$ne": ObjectId(cat_id)}
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Ya existe una categoría con el nombre '{cat.nombre}'")
    update_data = {}
    cat_dict = cat.dict()
    for k, v in cat_dict.items():
        if k == "categoria_padre_id":
            update_data[k] = None if (v is None or v == '__CLEAR__') else v
        elif v is not None:
            update_data[k] = v
    await db.categorias.update_one({"_id": ObjectId(cat_id)}, {"$set": update_data})
    updated = await db.categorias.find_one({"_id": ObjectId(cat_id)})
    return format_cat(updated)

@router.delete("/{cat_id}")
async def delete_category(cat_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    categoria = await db.categorias.find_one({"_id": ObjectId(cat_id)})
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    nuevo_estado = not categoria.get("activo", True)
    await db.categorias.update_one({"_id": ObjectId(cat_id)}, {"$set": {"activo": nuevo_estado}})
    return {"message": f"Categoría {'activada' if nuevo_estado else 'desactivada'} correctamente"}