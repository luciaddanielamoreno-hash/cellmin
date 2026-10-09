from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.cash_register import CashOpen, CashClose, CashMovement, MontoPorMetodo
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime
from app.utils.logger import registrar_auditoria

router = APIRouter()

@router.get("/actual")
async def get_current_cash(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "caja:read")
    db = get_db()
    sucursal = current_user["sucursales"][0]
    caja = await db.cajas.find_one({"estado": "abierta", "sucursal": sucursal})
    if not caja:
        return {"estado": "cerrada"}

    # Ventas del día
    ventas = await db.ventas.find({
        "estado": {"$in": ["completada", "cancelada"]},
        "fecha": {"$gte": caja["fecha_apertura"]},
        "sucursal": sucursal
    }).to_list(1000)
    total_ventas_hoy = sum(v["total"] for v in ventas)

    # Armar listado completo de movimientos
    movimientos_completos = []

    # Agregar ventas
    for v in ventas:
        movimientos_completos.append({
            "tipo": "ingreso",
            "concepto": "venta",
            "descripcion": f"Venta {v.get('numero_venta', '')}"
            + (" (cancelada)" if v.get("estado") == "cancelada" else ""),
            "metodo_pago": v.get("metodo_pago", ""),
            "monto": v["total"],
            "fecha": v["fecha"]
        })

    # Agregar movimientos manuales y cobros de reparaciones
    for m in caja.get("movimientos", []):
        concepto = m.get("concepto", "manual")
        if concepto == "reparacion":
            descripcion = m.get("motivo", "Cobro de reparación")
        else:
            descripcion = m.get("motivo", "Movimiento manual")

        movimientos_completos.append({
            "tipo": m["tipo"],
            "concepto": concepto,
            "descripcion": descripcion,
            "metodo_pago": m.get("metodo_pago", ""),
            "monto": m["monto"],
            "fecha": m["fecha"]
        })

    # Ordenar por fecha
    movimientos_completos.sort(key=lambda x: x["fecha"])

    caja["id"] = str(caja["_id"])
    caja["total_ventas_hoy"] = total_ventas_hoy
    caja["movimientos_completos"] = movimientos_completos
    del caja["_id"]
    return caja

@router.post("/abrir")
async def open_cash(data: CashOpen, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "caja:open")
    db = get_db()
    sucursal = data.sucursal
    caja_abierta = await db.cajas.find_one({"estado": "abierta", "sucursal": sucursal})
    if caja_abierta:
        raise HTTPException(status_code=400, detail="Ya hay una caja abierta en esta sucursal")
    new_caja = {
        "estado": "abierta",
        "sucursal": sucursal,
        "monto_inicial": data.monto_inicial,
        "movimientos": [],
        "usuario_apertura_id": current_user["user_id"],
        "fecha_apertura": datetime.utcnow(),
        "notas": data.notas
    }
    result = await db.cajas.insert_one(new_caja)

    await registrar_auditoria(
    db=db,
    usuario_id=current_user["user_id"],
    usuario_nombre="",
    rol=current_user["role"],
    accion="abrir",
    modulo="caja",
    descripcion=f"Caja abierta en {sucursal}"
    )

    return {"message": "Caja abierta correctamente", "id": str(result.inserted_id)}

@router.post("/movimiento")
async def add_movement(data: CashMovement, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "caja:open")
    db = get_db()
    sucursal = current_user["sucursales"][0]
    caja = await db.cajas.find_one({"estado": "abierta", "sucursal": sucursal})
    if not caja:
        raise HTTPException(status_code=400, detail="No hay caja abierta en tu sucursal")
    movimiento = {
        "tipo": data.tipo,
        "monto": data.monto,
        "motivo": data.motivo,
        "metodo_pago": data.metodo_pago,
        "notas": data.notas,
        "usuario_id": current_user["user_id"],
        "fecha": datetime.utcnow()
    }
    await db.cajas.update_one(
        {"_id": caja["_id"]},
        {"$push": {"movimientos": movimiento}}
    )
    return {"message": "Movimiento registrado"}

@router.post("/cerrar")
async def close_cash(data: CashClose, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "caja:close")
    db = get_db()
    sucursal = current_user["sucursales"][0]
    caja = await db.cajas.find_one({"estado": "abierta", "sucursal": sucursal})
    if not caja:
        raise HTTPException(status_code=400, detail="No hay caja abierta en tu sucursal")

    ventas = await db.ventas.find({
        "estado": {"$in": ["completada", "cancelada"]},
        "fecha": {"$gte": caja["fecha_apertura"]},
        "sucursal": sucursal
    }).to_list(1000)

    total_ventas = sum(v["total"] for v in ventas)

    ventas_por_metodo = {}
    for v in ventas:
        metodo = v.get("metodo_pago", "efectivo")
        if "+" not in metodo:
            ventas_por_metodo[metodo] = ventas_por_metodo.get(metodo, 0) + v["total"]
        else:
            partes = metodo.split("+")
            for parte in partes:
                parte = parte.strip()
                if ":" in parte:
                    met, monto_str = parte.split(":")
                    met = met.strip()
                    try:
                        monto_val = float(monto_str.replace("$", "").replace(".", "").replace(",", ".").strip())
                        ventas_por_metodo[met] = ventas_por_metodo.get(met, 0) + monto_val
                    except:
                        pass

    movimientos_por_metodo = {}
    for m in caja.get("movimientos", []):
        metodo = m.get("metodo_pago", "efectivo")
        monto = m.get("monto", 0)
        if m.get("tipo") == "ingreso":
            movimientos_por_metodo[metodo] = movimientos_por_metodo.get(metodo, 0) + monto
        else:
            movimientos_por_metodo[metodo] = movimientos_por_metodo.get(metodo, 0) - monto

    todos_metodos = set(list(ventas_por_metodo.keys()) + list(movimientos_por_metodo.keys()) + ['efectivo'])
    esperado_por_metodo = {}
    for metodo in todos_metodos:
        base = caja["monto_inicial"] if metodo == "efectivo" else 0
        esperado_por_metodo[metodo] = (
            base +
            ventas_por_metodo.get(metodo, 0) +
            movimientos_por_metodo.get(metodo, 0)
        )

    monto_esperado_total = sum(esperado_por_metodo.values())
    monto_real_total = sum(m.monto for m in data.montos_por_metodo)
    diferencia_total = monto_real_total - monto_esperado_total

    diferencias_por_metodo = {}
    for m in data.montos_por_metodo:
        esperado = esperado_por_metodo.get(m.metodo, 0)
        diferencias_por_metodo[m.metodo] = m.monto - esperado

    await db.cajas.update_one(
        {"_id": caja["_id"]},
        {"$set": {
            "estado": "cerrada",
            "monto_final_esperado": monto_esperado_total,
            "monto_final_real": monto_real_total,
            "diferencia": diferencia_total,
            "total_ventas": total_ventas,
            "ventas_por_metodo": ventas_por_metodo,
            "esperado_por_metodo": esperado_por_metodo,
            "montos_reales_por_metodo": {m.metodo: m.monto for m in data.montos_por_metodo},
            "diferencias_por_metodo": diferencias_por_metodo,
            "usuario_cierre_id": current_user["user_id"],
            "fecha_cierre": datetime.utcnow(),
            "notas_cierre": data.notas
        }}
    )

    await registrar_auditoria(
    db=db,
    usuario_id=current_user["user_id"],
    usuario_nombre="",
    rol=current_user["role"],
    accion="cerrar",
    modulo="caja",
    descripcion=f"Caja cerrada en {sucursal}. Total ventas: {total_ventas}"
    )

    return {
        "message": "Caja cerrada correctamente",
        "total_ventas": total_ventas,
        "ventas_por_metodo": ventas_por_metodo,
        "esperado_por_metodo": esperado_por_metodo,
        "monto_esperado": monto_esperado_total,
        "monto_real": monto_real_total,
        "diferencia": diferencia_total,
        "montos_reales_por_metodo": {m.metodo: m.monto for m in data.montos_por_metodo},
        "diferencias_por_metodo": diferencias_por_metodo,
    }

@router.get("/historial")
async def get_cash_history(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "caja:read")
    db = get_db()
    cajas = await db.cajas.find().sort("fecha_apertura", -1).to_list(100)
    return [{**c, "_id": str(c["_id"])} for c in cajas]