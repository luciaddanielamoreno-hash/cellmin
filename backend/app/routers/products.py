from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.product import ProductCreate, ProductUpdate
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime

router = APIRouter()

def format_product(p):
    return {
        "id": str(p["_id"]),
        "nombre": p["nombre"],
        "descripcion": p.get("descripcion"),
        "categoria_id": p.get("categoria_id"),
        "codigo_barras": p.get("codigo_barras"),
        "unidad_medida": p.get("unidad_medida"),
        "tiene_variantes": p.get("tiene_variantes", False),
        "variantes": p.get("variantes", []),
        "precio_costo": p.get("precio_costo"),
        "precio_venta": p.get("precio_venta"),
        "stock_actual": p.get("stock_actual", 0),
        "stock_minimo": p.get("stock_minimo", 0),
        "activo": p.get("activo", True),
        "fecha_creacion": p.get("fecha_creacion")
    }

@router.get("/")
async def get_products(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user["role"] in ["administrador", "deposito"]:
        products = await db.productos.find().to_list(1000)
    else:
        products = await db.productos.find({"activo": True}).to_list(1000)
    return [format_product(p) for p in products]

@router.get("/{product_id}")
async def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    product = await db.productos.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return format_product(product)

@router.post("/")
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "productos:create")
    db = get_db()
    existing = await db.productos.find_one({"nombre": {"$regex": f"^{product.nombre}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un producto con el nombre '{product.nombre}'")
    new_product = {
        **product.dict(),
        "fecha_creacion": datetime.utcnow()
    }
    result = await db.productos.insert_one(new_product)
    new_product["_id"] = result.inserted_id
    return format_product(new_product)

@router.put("/{product_id}")
async def update_product(product_id: str, product: ProductUpdate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "productos:update")
    db = get_db()
    if product.nombre:
        existing = await db.productos.find_one({
            "nombre": {"$regex": f"^{product.nombre}$", "$options": "i"},
            "_id": {"$ne": ObjectId(product_id)}
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Ya existe un producto con el nombre '{product.nombre}'")
    update_data = {k: v for k, v in product.dict().items() if v is not None}
    await db.productos.update_one({"_id": ObjectId(product_id)}, {"$set": update_data})
    updated = await db.productos.find_one({"_id": ObjectId(product_id)})
    return format_product(updated)

@router.delete("/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    producto = await db.productos.find_one({"_id": ObjectId(product_id)})
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    nuevo_estado = not producto.get("activo", True)
    await db.productos.update_one({"_id": ObjectId(product_id)}, {"$set": {"activo": nuevo_estado}})
    return {"message": f"Producto {'activado' if nuevo_estado else 'desactivado'} correctamente"}

@router.delete("/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    await db.productos.update_one({"_id": ObjectId(product_id)}, {"$set": {"activo": False}})
    return {"message": "Producto eliminado correctamente"}