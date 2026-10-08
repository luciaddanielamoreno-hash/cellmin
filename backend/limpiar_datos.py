import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

COLECCIONES = [
    "ventas",
    "compras",
    "stock_movimientos",
    "cajas",
    "reparaciones",
    "auditoria",
    "contadores",
]


async def main():
    db = AsyncIOMotorClient(settings.mongodb_url)[settings.database_name]
    print(f"Base: {settings.database_name}")
    if input("Escribí BORRAR para continuar: ") != "BORRAR":
        print("Cancelado")
        return
    for c in COLECCIONES:
        r = await db[c].delete_many({})
        print(f"{c}: {r.deleted_count} borrados")


asyncio.run(main())