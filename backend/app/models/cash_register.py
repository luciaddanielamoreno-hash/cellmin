from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class MontoPorMetodo(BaseModel):
    metodo: str
    monto: float

class CashMovement(BaseModel):
    tipo: str
    monto: float
    motivo: str
    metodo_pago: str = "efectivo"
    notas: Optional[str] = None

class CashOpen(BaseModel):
    monto_inicial: float
    sucursal: str = "sucursal_1"
    notas: Optional[str] = None

class CashClose(BaseModel):
    montos_por_metodo: List[MontoPorMetodo]
    # Efectivo que queda en la caja para el día siguiente (será el monto
    # inicial esperado de la próxima apertura). El resto se retira.
    dejar_en_caja: float = 0
    notas: Optional[str] = None

class CashResponse(BaseModel):
    id: str
    estado: str
    monto_inicial: float
    monto_final_esperado: Optional[float]
    monto_final_real: Optional[float]
    diferencia: Optional[float]
    movimientos: List[dict]
    usuario_apertura_id: str
    usuario_cierre_id: Optional[str]
    fecha_apertura: datetime
    fecha_cierre: Optional[datetime]