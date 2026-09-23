from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Equipo(BaseModel):
    marca: str
    modelo: str
    imei: Optional[str] = None
    problema_descripcion: Optional[str] = None

class TipoReparacionItem(BaseModel):
    tipo_id: str
    nombre: str
    precio: float

class Pago(BaseModel):
    monto: float
    tipo: str   # seña, saldo, total
    metodo: str # efectivo, transferencia, debito, credito

class RepairCreate(BaseModel):
    cliente_id: str
    equipo: Equipo
    tipos_reparacion: List[TipoReparacionItem] = []
    sucursal: str = "sucursal_1"
    notas_internas: Optional[str] = None
    garantia_dias: int = 90
    estado: str = "en_diagnostico"

class RepairUpdate(BaseModel):
    estado: Optional[str] = None
    tipos_reparacion: Optional[List[TipoReparacionItem]] = None
    notas_internas: Optional[str] = None
    tecnico_id: Optional[str] = None
    garantia_dias: Optional[int] = None

class RepairResponse(BaseModel):
    id: str
    numero_orden: str
    cliente_id: str
    equipo: Equipo
    estado: str
    tipos_reparacion: List[TipoReparacionItem]
    precio_total: float
    sucursal: str
    pagos: List[dict]
    total_pagado: float
    saldo_pendiente: float
    garantia_dias: int
    fecha_vencimiento_garantia: Optional[datetime]
    tecnico_id: Optional[str]
    notas_internas: Optional[str]
    usuario_id: str
    fecha_ingreso: datetime
    fecha_entrega: Optional[datetime]