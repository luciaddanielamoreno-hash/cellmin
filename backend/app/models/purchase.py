from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PurchaseItem(BaseModel):
    producto_id: str
    variante_nombre: Optional[str] = None
    nombre_producto: str
    cantidad: int
    precio_unitario: float
    subtotal: float

class PurchaseCreate(BaseModel):
    proveedor_id: str
    items: List[PurchaseItem]
    total: float
    numero_remito: Optional[str] = None
    notas: Optional[str] = None

class PurchaseResponse(BaseModel):
    id: str
    numero_compra: str
    proveedor_id: str
    items: List[PurchaseItem]
    total: float
    numero_remito: Optional[str]
    notas: Optional[str]
    usuario_id: str
    fecha: datetime