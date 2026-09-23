from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Variante(BaseModel):
    nombre: str
    sku: Optional[str] = None
    codigo_barras: Optional[str] = None
    precio_costo: float
    precio_venta: float
    stock_actual: int = 0
    stock_minimo: int = 0

class ProductCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    categoria_id: str
    codigo_barras: Optional[str] = None
    unidad_medida: str
    tiene_variantes: bool = False
    variantes: List[Variante] = []
    precio_costo: Optional[float] = None
    precio_venta: Optional[float] = None
    stock_actual: Optional[int] = 0
    stock_minimo: Optional[int] = 0
    activo: bool = True

class ProductUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria_id: Optional[str] = None
    codigo_barras: Optional[str] = None
    unidad_medida: Optional[str] = None
    tiene_variantes: Optional[bool] = None
    variantes: Optional[List[Variante]] = None
    precio_costo: Optional[float] = None
    precio_venta: Optional[float] = None
    stock_minimo: Optional[int] = None
    activo: Optional[bool] = None

class ProductResponse(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str]
    categoria_id: str
    codigo_barras: Optional[str]
    unidad_medida: str
    tiene_variantes: bool
    variantes: List[Variante]
    precio_costo: Optional[float]
    precio_venta: Optional[float]
    stock_actual: Optional[int]
    stock_minimo: Optional[int]
    activo: bool
    fecha_creacion: datetime