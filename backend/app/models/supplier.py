from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class SupplierCreate(BaseModel):
    nombre: str
    cuit: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    contacto: Optional[str] = None

class SupplierUpdate(BaseModel):
    nombre: Optional[str] = None
    cuit: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    contacto: Optional[str] = None
    activo: Optional[bool] = None

class SupplierResponse(BaseModel):
    id: str
    nombre: str
    cuit: Optional[str]
    telefono: Optional[str]
    email: Optional[str]
    direccion: Optional[str]
    contacto: Optional[str]
    activo: bool
    fecha_creacion: datetime