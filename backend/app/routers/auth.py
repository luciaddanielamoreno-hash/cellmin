from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.database import get_db
from app.utils.auth import verify_password, create_access_token, get_current_user
from bson import ObjectId
from app.routers.audit import registrar_auditoria

router = APIRouter()

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    user = await db.usuarios.find_one({"email": form_data.username, "activo": True})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    sucursales = user.get("sucursales", [user.get("sucursal", "sucursal_1")])
    token = create_access_token({
        "sub": str(user["_id"]),
        "role": user["rol"],
        "nombre": user["nombre"],
        "sucursales": sucursales,
    })

    await registrar_auditoria(
    db=db,
    usuario_id=str(user["_id"]),
    usuario_nombre=user["nombre"],
    rol=user["rol"],
    accion="login",
    modulo="autenticacion",
    descripcion=f"Inicio de sesión exitoso"
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "rol": user["rol"],
        "nombre": user["nombre"],
        "sucursales": sucursales,
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.usuarios.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {
        "id": str(user["_id"]),
        "nombre": user["nombre"],
        "email": user["email"],
        "rol": user["rol"],
        "sucursales": user.get("sucursales", [user.get("sucursal", "sucursal_1")]),
    }