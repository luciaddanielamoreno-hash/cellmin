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

class PagoVenta(BaseModel):
    metodo: str  # efectivo, transferencia, debito, credito
    monto: float = 0

class SaleCreate(BaseModel):
    cliente_id: Optional[str] = None
    items: List[SaleItem]
    # El backend recalcula precios, descuento e interés. Estos valores del
    # frontend solo se usan para detectar que los precios cambiaron.
    descuento: float = 0
    total: float
    tipo_ajuste: str = "ninguno"  # ninguno, descuento, interes
    porcentaje_ajuste: float = 0
    metodo_pago: str = ""  # texto legado; si viene "pagos" se arma en el servidor
    pagos: Optional[List[PagoVenta]] = None
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