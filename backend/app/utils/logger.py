"""
Registro de actividad del sistema en archivos (reemplaza al modulo de Auditoria).

Archivos (carpeta backend/logs, rotan solos al llegar a 5 MB y guardan 10 copias):
  - actividad.log : acciones de negocio (quien hizo que) via registrar_auditoria()
  - accesos.log   : cada pedido HTTP (metodo, ruta, estado, tiempo)
  - errores.log   : errores no controlados con el traceback completo

Nunca se escriben contrasenas, tokens ni codigos de bloqueo de equipos.
"""
import json
import logging
import os
from logging.handlers import RotatingFileHandler

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

_CAMPOS_SENSIBLES = (
    "password", "contraseña", "hash", "token", "secret", "bloqueo", "pin", "patron",
)


def _crear(nombre: str, archivo: str, nivel=logging.INFO) -> logging.Logger:
    logger = logging.getLogger(nombre)
    if logger.handlers:  # evita duplicar handlers con --reload
        return logger
    logger.setLevel(nivel)
    logger.propagate = False
    handler = RotatingFileHandler(
        os.path.join(LOG_DIR, archivo),
        maxBytes=5 * 1024 * 1024,
        backupCount=10,
        encoding="utf-8",
    )
    handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
    logger.addHandler(handler)
    return logger


log_actividad = _crear("cellmin.actividad", "actividad.log")
log_accesos = _crear("cellmin.accesos", "accesos.log")
log_errores = _crear("cellmin.errores", "errores.log", logging.ERROR)


def _limpiar(valor, profundidad=0):
    """Quita campos sensibles y recorta textos largos."""
    if profundidad > 4:
        return "..."
    if isinstance(valor, dict):
        return {
            k: "***" if any(s in str(k).lower() for s in _CAMPOS_SENSIBLES)
            else _limpiar(v, profundidad + 1)
            for k, v in valor.items()
        }
    if isinstance(valor, (list, tuple)):
        return [_limpiar(v, profundidad + 1) for v in valor[:20]]
    if isinstance(valor, str) and len(valor) > 300:
        return valor[:300] + "..."
    return valor


async def registrar_auditoria(
    db=None,
    usuario_id: str = "",
    usuario_nombre: str = "",
    rol: str = "",
    accion: str = "",
    modulo: str = "",
    descripcion: str = "",
    dato_anterior=None,
    dato_nuevo=None,
):
    """Misma firma que antes; ahora escribe en actividad.log. Nunca rompe la operacion."""
    try:
        extra = {}
        if dato_anterior is not None:
            extra["antes"] = _limpiar(dato_anterior)
        if dato_nuevo is not None:
            extra["despues"] = _limpiar(dato_nuevo)
        detalle = f" | {json.dumps(extra, default=str, ensure_ascii=False)}" if extra else ""
        log_actividad.info(
            f"usuario={usuario_id} rol={rol} modulo={modulo} accion={accion} | {descripcion}{detalle}"
        )
    except Exception:
        pass
