from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class AuditLog(BaseModel):
    id: Optional[str] = None
    usuario_id: str
    usuario_nombre: str
    rol: str
    accion: str
    modulo: str
    descripcion: str
    dato_anterior: Optional[Any] = None
    dato_nuevo: Optional[Any] = None
    ip: Optional[str] = None
    fecha: datetime