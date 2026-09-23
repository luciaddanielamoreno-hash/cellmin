from pydantic import BaseModel
from typing import Optional

class RepairTypeCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    precio: float
    activo: bool = True

class RepairTypeUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    activo: Optional[bool] = None

class RepairTypeResponse(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str]
    precio: float
    activo: bool