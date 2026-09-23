from fastapi import HTTPException, status

PERMISSIONS = {
    "administrador": ["*"],
    "cajero": [
        "dashboard:read",
        "ventas:read", "ventas:create", "ventas:cancel",
        "caja:open", "caja:close", "caja:read",
        "clientes:read", "clientes:create",
        "productos:read", "stock:read",
        "reparaciones:read", "reparaciones:create",
        "reparaciones:update_estado", "reparaciones:presupuesto",
        "reparaciones:pago", "reparaciones:entregar",
    ],
    "vendedor": [
        "dashboard:read",
        "ventas:read", "ventas:create",
        "clientes:read", "clientes:create",
        "productos:read", "stock:read",
        "reparaciones:read", "reparaciones:create",
        "reparaciones:update_estado", "reparaciones:presupuesto",
        "reparaciones:entregar",
    ],
    "deposito": [
        "dashboard:read",
        "productos:read", "productos:create", "productos:update",
        "categorias:read", "categorias:create", "categorias:update",
        "stock:read", "stock:create", "stock:update",
        "compras:read", "compras:create",
        "proveedores:read", "proveedores:create", "proveedores:update",
    ],
    "tecnico": [
    "dashboard:read",
    "reparaciones:read", "reparaciones:create",
    "reparaciones:update_estado", "reparaciones:presupuesto",
    "reparaciones:entregar",
    "clientes:read", "clientes:create",
    "tipos_reparacion:read", "tipos_reparacion:create",
    "tipos_reparacion:update",
],
}

def check_permission(role: str, permission: str):
    perms = PERMISSIONS.get(role, [])
    if "*" in perms or permission in perms:
        return True
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"No tenés permiso para realizar esta acción: {permission}"
    )

def require_permission(permission: str):
    def decorator(current_user: dict):
        check_permission(current_user["role"], permission)
        return current_user
    return decorator