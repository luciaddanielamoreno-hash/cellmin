"""Proteccion contra envios duplicados (doble click, reintentos de red).

El frontend genera una clave por cada formulario abierto. El servidor
la "reclama" antes de escribir: si la misma clave llega dos veces, la
segunda no crea nada y recibe el resultado de la primera.
"""
from datetime import datetime
from fastapi import HTTPException

COLECCION = "claves_idempotencia"


async def resultado_previo(db, clave, tipo):
    """Consulta (sin escribir) si la operacion ya se registro con esta clave."""
    if not clave:
        return None
    previo = await db[COLECCION].find_one({"_id": f"{tipo}:{clave}"})
    return previo.get("resultado") if previo else None


async def reclamar_clave(db, clave, tipo):
    """Devuelve None si la clave es nueva (queda reclamada) o el
    documento de la operacion ya registrada si la clave ya se uso.
    Sin clave no se protege nada."""
    if not clave:
        return None
    try:
        await db[COLECCION].insert_one({
            "_id": f"{tipo}:{clave}",
            "tipo": tipo,
            "resultado": None,
            "fecha": datetime.utcnow(),
        })
        return None
    except Exception as e:
        if "duplicate" not in str(e).lower() and "E11000" not in str(e):
            raise
    previo = await db[COLECCION].find_one({"_id": f"{tipo}:{clave}"})
    if previo and previo.get("resultado"):
        return previo
    raise HTTPException(
        status_code=409,
        detail="Esta operación ya se está procesando. Esperá un momento y revisá el listado.",
    )


async def guardar_resultado(db, clave, tipo, resultado):
    if clave:
        await db[COLECCION].update_one({"_id": f"{tipo}:{clave}"}, {"$set": {"resultado": resultado}})


async def liberar_clave(db, clave, tipo):
    """Si la operacion fallo, se libera para poder reintentar."""
    if clave:
        await db[COLECCION].delete_one({"_id": f"{tipo}:{clave}"})
