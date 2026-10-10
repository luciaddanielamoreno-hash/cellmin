from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.cash_register import CashOpen, CashClose, CashMovement, MontoPorMetodo
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime
from app.utils.logger import registrar_auditoria
from app.utils.pagos import USD, cotizacion_para_cobro, pagos_de_venta, redondear

router = APIRouter()


def calcular_esperado(caja: dict, ventas: list) -> dict:
    """Lo que debería haber en la caja por medio de pago, en pesos.
    Los dólares se cuentan en pesos al valor con que se cobraron, y además
    se lleva la cantidad de dólares (billetes) que debería haber."""
    ventas_por_metodo = {}
    usd_cobrados = 0.0
    excedente = 0.0  # dólares cobrados de más en ventas (se devuelve como vuelto)
    for v in ventas:
        excedente += v.get("vuelto", 0) or 0
        for p in pagos_de_venta(v):
            ventas_por_metodo[p["metodo"]] = ventas_por_metodo.get(p["metodo"], 0) + p["monto"]
            usd_cobrados += p.get("usd", 0) or 0

    movimientos_por_metodo = {}
    for m in caja.get("movimientos", []):
        metodo = m.get("metodo_pago", "efectivo")
        monto = m.get("monto", 0)
        if m.get("tipo") == "ingreso":
            movimientos_por_metodo[metodo] = movimientos_por_metodo.get(metodo, 0) + monto
            usd_cobrados += m.get("monto_usd", 0) or 0
        else:
            movimientos_por_metodo[metodo] = movimientos_por_metodo.get(metodo, 0) - monto
            usd_cobrados -= m.get("monto_usd", 0) or 0

    metodos = set(ventas_por_metodo) | set(movimientos_por_metodo) | {"efectivo"}
    esperado = {}
    for metodo in metodos:
        base = caja["monto_inicial"] if metodo == "efectivo" else 0
        esperado[metodo] = redondear(
            base + ventas_por_metodo.get(metodo, 0) + movimientos_por_metodo.get(metodo, 0)
        )
    return {
        "ventas_por_metodo": ventas_por_metodo,
        "esperado_por_metodo": esperado,
        "esperado_total": redondear(sum(esperado.values())),
        "esperado_usd": redondear(usd_cobrados),
        "excedente_ventas": redondear(excedente),
    }


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
            "monto_usd": sum((pg.get("usd") or 0) for pg in pagos_de_venta(v)) or None,
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
            "monto_usd": m.get("monto_usd"),
            "fecha": m["fecha"]
        })

    # Ordenar por fecha
    movimientos_completos.sort(key=lambda x: x["fecha"])

    esperado = calcular_esperado(caja, ventas)
    caja["id"] = str(caja["_id"])
    caja["total_ventas_hoy"] = total_ventas_hoy
    caja["esperado_por_metodo"] = esperado["esperado_por_metodo"]
    caja["esperado_total"] = esperado["esperado_total"]
    caja["esperado_usd"] = esperado["esperado_usd"]
    caja["excedente_ventas"] = esperado["excedente_ventas"]
    caja["movimientos_completos"] = movimientos_completos
    del caja["_id"]
    return caja

async def esperado_de_apertura(db, sucursal: str):
    """Efectivo que la última caja cerrada de la sucursal dejó para hoy (o None)."""
    ultima = await db.cajas.find_one(
        {"estado": "cerrada", "sucursal": sucursal, "monto_dejado": {"$ne": None}},
        sort=[("fecha_cierre", -1)],
    )
    if not ultima:
        return None
    return {
        "esperado": ultima["monto_dejado"],
        "caja_id": str(ultima["_id"]),
        "fecha_cierre": ultima.get("fecha_cierre"),
    }


@router.get("/esperado")
async def get_expected_opening(sucursal: str = None, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "caja:read")
    db = get_db()
    sucursal = sucursal or current_user["sucursales"][0]
    dato = await esperado_de_apertura(db, sucursal)
    return dato or {"esperado": None, "caja_id": None, "fecha_cierre": None}


@router.post("/abrir")
async def open_cash(data: CashOpen, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "caja:open")
    db = get_db()
    sucursal = data.sucursal
    if data.monto_inicial < 0:
        raise HTTPException(status_code=400, detail="El monto inicial no puede ser negativo")
    caja_abierta = await db.cajas.find_one({"estado": "abierta", "sucursal": sucursal})
    if caja_abierta:
        raise HTTPException(status_code=400, detail="Ya hay una caja abierta en esta sucursal")

    # Comparar con lo que quedó en la caja anterior
    previo = await esperado_de_apertura(db, sucursal)
    esperado = previo["esperado"] if previo else None
    diferencia_apertura = round(data.monto_inicial - esperado, 2) if esperado is not None else None

    new_caja = {
        "estado": "abierta",
        "sucursal": sucursal,
        "monto_inicial": data.monto_inicial,
        "monto_esperado_apertura": esperado,
        "diferencia_apertura": diferencia_apertura,
        "caja_anterior_id": previo["caja_id"] if previo else None,
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
    descripcion=f"Caja abierta en {sucursal}. Inicial: {data.monto_inicial}"
    + (f". Esperado: {esperado}. Diferencia: {diferencia_apertura}" if esperado is not None else "")
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

    calculo = calcular_esperado(caja, ventas)
    ventas_por_metodo = calculo["ventas_por_metodo"]
    esperado_por_metodo = calculo["esperado_por_metodo"]
    esperado_usd = calculo["esperado_usd"]

    monto_esperado_total = calculo["esperado_total"]

    # Los dólares se cuentan en billetes (USD). Para compararlos con lo
    # esperado en pesos se valúan al promedio con que se cobraron.
    usd_contado = round(sum(m.monto for m in data.montos_por_metodo if m.metodo == USD), 2)
    pesos_esperados_usd = esperado_por_metodo.get(USD, 0)
    if esperado_usd > 0:
        tasa_usd = pesos_esperados_usd / esperado_usd
    else:
        tasa_usd = 0.0
        if usd_contado > 0:
            tasa_usd = await cotizacion_para_cobro(db)
    montos_reales = {}
    for m in data.montos_por_metodo:
        montos_reales[m.metodo] = redondear(m.monto * tasa_usd) if m.metodo == USD else m.monto
    diferencia_usd = round(usd_contado - esperado_usd, 2)
    monto_real_total = sum(montos_reales.values())

    # Efectivo que se deja en caja para mañana; el resto del efectivo se retira
    efectivo_contado = sum(m.monto for m in data.montos_por_metodo if m.metodo == "efectivo")
    if data.dejar_en_caja < 0:
        raise HTTPException(status_code=400, detail="El monto a dejar en caja no puede ser negativo")
    if data.dejar_en_caja > efectivo_contado + 0.001:
        raise HTTPException(
            status_code=400,
            detail="No podés dejar en caja más efectivo del que contaste",
        )
    monto_dejado = round(data.dejar_en_caja, 2)
    monto_retirado = round(efectivo_contado - monto_dejado, 2)
    diferencia_total = monto_real_total - monto_esperado_total

    diferencias_por_metodo = {}
    for metodo, real in montos_reales.items():
        diferencias_por_metodo[metodo] = redondear(real - esperado_por_metodo.get(metodo, 0))

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
            "montos_reales_por_metodo": montos_reales,
            "diferencias_por_metodo": diferencias_por_metodo,
            "usuario_cierre_id": current_user["user_id"],
            "fecha_cierre": datetime.utcnow(),
            "monto_dejado": monto_dejado,
            "monto_retirado": monto_retirado,
            "usd_esperado": esperado_usd,
            "usd_contado": usd_contado,
            "usd_diferencia": diferencia_usd,
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
        "montos_reales_por_metodo": montos_reales,
        "diferencias_por_metodo": diferencias_por_metodo,
        "monto_dejado": monto_dejado,
        "monto_retirado": monto_retirado,
        "usd_esperado": esperado_usd,
        "usd_contado": usd_contado,
        "usd_diferencia": diferencia_usd,
        "monto_inicial": caja["monto_inicial"],
        "monto_esperado_apertura": caja.get("monto_esperado_apertura"),
        "diferencia_apertura": caja.get("diferencia_apertura"),
    }

@router.get("/historial")
async def get_cash_history(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "caja:read")
    db = get_db()
    cajas = await db.cajas.find().sort("fecha_apertura", -1).to_list(100)
    return [{**c, "_id": str(c["_id"])} for c in cajas]