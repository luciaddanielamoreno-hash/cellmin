from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client = None
db = None

async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]
    print("✅ Conectado a MongoDB")

async def close_db():
    global client
    if client:
        client.close()
        print("🔌 Conexión MongoDB cerrada")

def get_db():
    return db