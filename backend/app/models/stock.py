from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class StockMovement(BaseModel):
    producto_id: str
    variante_nombre: Optional[str] = None
    tipo: str  # entrada, salida, ajuste
    cantidad: int
    motivo: str  # compra, venta, ajuste_manual, devolucion
    referencia_id: Optional[str] = None  # id de venta o compra
    notas: Optional[str] = None

class StockMovementResponse(BaseModel):
    id: str
    producto_id: str
    variante_nombre: Optional[str]
    tipo: str
    cantidad: int
    motivo: str
    referencia_id: Optional[str]
    notas: Optional[str]
    usuario_id: str
    fecha: datetime