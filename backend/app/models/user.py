from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    rol: str  # administrador, cajero, vendedor, deposito, tecnico
    sucursales: List[str] = ["sucursal_1"]

class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    rol: Optional[str] = None
    sucursales: Optional[List[str]] = None
    activo: Optional[bool] = None

class UserResponse(BaseModel):
    id: str
    nombre: str
    email: str
    rol: str
    sucursales: List[str]
    activo: bool
    fecha_creacion: datetime