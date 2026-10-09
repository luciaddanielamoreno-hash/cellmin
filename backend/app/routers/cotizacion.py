from fastapi import APIRouter, Depends
from app.database import get_db
from app.utils.auth import get_current_user
from app.utils.cotizacion import obtener_cotizacion

router = APIRouter()


@router.get("/")
async def get_cotizacion(current_user: dict = Depends(get_current_user)):
    return await obtener_cotizacion(get_db())
