"""
Cotización del dólar blue (precio de VENTA).

- Se consulta a dolarapi.com y se guarda en memoria unos minutos para no
  pedirla en cada pantalla.
- Cada cotización exitosa también se guarda en la base (colección
  "configuracion"), así el sistema tiene un último valor aunque se reinicie
  o el servicio externo esté caído.
- Si el servicio falla se usa el último valor conocido y se marca como
  "obsoleta". Si nunca hubo ninguno, "disponible" es False y el sistema
  sigue funcionando sin precios en USD.
"""
import asyncio
import json
import time
import urllib.request
from datetime import datetime

from app.utils.logger import log_errores

URL = "https://dolarapi.com/v1/dolares/blue"
VIGENCIA_SEGUNDOS = 10 * 60
TIMEOUT_SEGUNDOS = 5
DOC_ID = "cotizacion_blue"

_cache = {"datos": None, "consultada": 0.0}


def _pedir() -> dict:
    req = urllib.request.Request(URL, headers={"Accept": "application/json", "User-Agent": "cellmin"})
    with urllib.request.urlopen(req, timeout=TIMEOUT_SEGUNDOS) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    venta = float(data["venta"])
    compra = float(data.get("compra") or 0)
    if venta <= 0:
        raise ValueError("cotización inválida")
    return {"venta": venta, "compra": compra, "fecha": data.get("fechaActualizacion")}


def _respuesta(datos: dict, obsoleta: bool) -> dict:
    return {
        "disponible": True,
        "venta": datos["venta"],
        "compra": datos.get("compra", 0),
        "fecha": datos.get("fecha"),
        "obsoleta": obsoleta,
        "fuente": "dolarapi.com (blue)",
    }


async def obtener_cotizacion(db=None) -> dict:
    ahora = time.monotonic()
    if _cache["datos"] and ahora - _cache["consultada"] < VIGENCIA_SEGUNDOS:
        return _respuesta(_cache["datos"], obsoleta=False)

    try:
        datos = await asyncio.to_thread(_pedir)
        _cache["datos"] = datos
        _cache["consultada"] = ahora
        if db is not None:
            await db.configuracion.update_one(
                {"_id": DOC_ID},
                {"$set": {**datos, "guardada": datetime.utcnow()}},
                upsert=True,
            )
        return _respuesta(datos, obsoleta=False)
    except Exception as e:
        log_errores.error(f"No se pudo obtener la cotización del dólar: {e!r}")

    # Falló el servicio: último valor conocido (memoria, o base si se reinició)
    if _cache["datos"]:
        return _respuesta(_cache["datos"], obsoleta=True)
    if db is not None:
        try:
            guardado = await db.configuracion.find_one({"_id": DOC_ID})
        except Exception:
            guardado = None
        if guardado and guardado.get("venta"):
            _cache["datos"] = {k: guardado.get(k) for k in ("venta", "compra", "fecha")}
            return _respuesta(_cache["datos"], obsoleta=True)
    return {"disponible": False, "venta": None, "compra": None, "fecha": None, "obsoleta": False, "fuente": None}


async def cotizacion_venta(db=None) -> float | None:
    """Valor de 1 USD en pesos (blue venta) o None si no hay ninguno."""
    c = await obtener_cotizacion(db)
    return c["venta"] if c["disponible"] else None
