from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SaleItem(BaseModel):
    producto_id: str
    variante_nombre: Optional[str] = None
    nombre_producto: str
    cantidad: int
    precio_unitario: float
    subtotal: float

class SaleCreate(BaseModel):
    cliente_id: Optional[str] = None
    items: List[SaleItem]
    descuento: float = 0
    total: float
    metodo_pago: str  # efectivo, transferencia, debito, credito
    sucursal: str = "sucursal_1"
    notas: Optional[str] = None

class SaleResponse(BaseModel):
    id: str
    numero_venta: str
    cliente_id: Optional[str]
    items: List[SaleItem]
    descuento: float
    total: float
    metodo_pago: str
    sucursal: str
    estado: str       # completada, cancelada
    usuario_id: str
    notas: Optional[str]
    fecha: datetime