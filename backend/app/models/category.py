from pydantic import BaseModel
from typing import Optional

class CategoryCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    categoria_padre_id: Optional[str] = None

class CategoryUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria_padre_id: Optional[str] = '__CLEAR__'
    activo: Optional[bool] = None

class CategoryResponse(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str]
    categoria_padre_id: Optional[str]
    activo: bool