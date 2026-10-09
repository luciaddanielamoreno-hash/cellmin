from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.repair import RepairCreate, RepairUpdate, Pago
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime, timedelta
from app.utils.logger import registrar_auditoria

router = APIRouter()

async def get_next_number(db) -> str:
    counter = await db.contadores.find_one_and_update(
        {"_id": "reparaciones"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return f"OR-{str(counter['seq']).zfill(4)}"

def format_repair(r):
    r["id"] = str(r["_id"])
    del r["_id"]
    return r

METODOS_VALIDOS = ("efectivo", "transferencia", "debito", "credito")


def validar_bloqueo(equipo: dict) -> dict:
    """Normaliza y valida el bloqueo de pantalla del equipo."""
    tipo = equipo.get("bloqueo_tipo") or "ninguno"
    valor = (equipo.get("bloqueo_valor") or "").strip()

    if tipo == "ninguno":
        valor = None
    elif tipo == "patron":
        puntos = valor.split("-") if valor else []
        if (
            len(puntos) < 4
            or any(p not in "123456789" or len(p) != 1 for p in puntos)
            or len(set(puntos)) != len(puntos)
        ):
            raise HTTPException(
                status_code=400,
                detail="El patrón debe unir al menos 4 puntos distintos",
            )
    elif tipo == "pin":
        if not valor.isdigit() or not (4 <= len(valor) <= 16):
            raise HTTPException(status_code=400, detail="El PIN debe tener entre 4 y 16 números")
    elif tipo == "password":
        if not valor or len(valor) > 64:
            raise HTTPException(status_code=400, detail="Ingresá la contraseña del equipo (máximo 64 caracteres)")
    else:
        raise HTTPException(status_code=400, detail="Tipo de bloqueo inválido")

    equipo["bloqueo_tipo"] = tipo
    equipo["bloqueo_valor"] = valor
    return equipo


async def caja_abierta_del_usuario(db, current_user):
    sucursal = current_user["sucursales"][0]
    return await db.cajas.find_one({"estado": "abierta", "sucursal": sucursal})


@router.get("/")
async def get_repairs(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "reparaciones:read")
    db = get_db()
    repairs = await db.reparaciones.find().sort("fecha_ingreso", -1).to_list(500)
    return [format_repair(r) for r in repairs]

@router.get("/pendientes")
async def get_pending_repairs(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "reparaciones:read")
    db = get_db()
    repairs = await db.reparaciones.find({
        "estado": {"$in": ["en_diagnostico", "ingresada", "en_reparacion", "lista"]}
    }).sort("fecha_ingreso", -1).to_list(500)
    return [format_repair(r) for r in repairs]

@router.get("/{repair_id}")
async def get_repair(repair_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "reparaciones:read")
    db = get_db()
    if not ObjectId.is_valid(repair_id):
        raise HTTPException(status_code=404, detail="Reparación no encontrada")
    repair = await db.reparaciones.find_one({"_id": ObjectId(repair_id)})
    if not repair:
        raise HTTPException(status_code=404, detail="Reparación no encontrada")
    return format_repair(repair)

@router.post("/")
async def create_repair(repair: RepairCreate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "reparaciones:create")
    db = get_db()

    data = repair.dict()
    sena = data.pop("sena", None)
    data["equipo"] = validar_bloqueo(data["equipo"])
    precio_total = sum(t["precio"] for t in data["tipos_reparacion"])

    # Validar la seña ANTES de crear nada
    caja = None
    if sena:
        check_permission(current_user["role"], "reparaciones:pago")
        if precio_total <= 0:
            raise HTTPException(
                status_code=400,
                detail="No se puede cobrar una seña mientras la orden está en diagnóstico. Definí las reparaciones primero.",
            )
        if sena["metodo"] not in METODOS_VALIDOS:
            raise HTTPException(status_code=400, detail="Medio de pago inválido")
        if sena["monto"] <= 0:
            raise HTTPException(status_code=400, detail="La seña debe ser mayor a 0")
        if sena["monto"] > precio_total:
            raise HTTPException(status_code=400, detail="La seña no puede superar el total de la reparación")
        caja = await caja_abierta_del_usuario(db, current_user)
        if not caja:
            raise HTTPException(status_code=400, detail="Debe haber una caja abierta para cobrar la seña")

    numero = await get_next_number(db)
    pagos = []
    total_pagado = 0
    if sena:
        total_pagado = sena["monto"]
        pagos.append({
            "monto": sena["monto"],
            "tipo": "total" if sena["monto"] >= precio_total else "seña",
            "metodo": sena["metodo"],
            "usuario_id": current_user["user_id"],
            "fecha": datetime.utcnow(),
        })

    new_repair = {
        **data,
        "numero_orden": numero,
        "precio_total": precio_total,
        "pagos": pagos,
        "total_pagado": total_pagado,
        "saldo_pendiente": precio_total - total_pagado,
        "tecnico_id": None,
        "usuario_id": current_user["user_id"],
        "fecha_ingreso": datetime.utcnow(),
        "fecha_entrega": None,
        "fecha_vencimiento_garantia": None
    }
    result = await db.reparaciones.insert_one(new_repair)
    new_repair["_id"] = result.inserted_id

    if sena:
        await db.cajas.update_one(
            {"_id": caja["_id"]},
            {"$push": {"movimientos": {
                "tipo": "ingreso",
                "monto": sena["monto"],
                "motivo": f"Reparación {numero} — {sena['metodo']}",
                "metodo_pago": sena["metodo"],
                "concepto": "reparacion",
                "referencia_id": str(result.inserted_id),
                "notas": f"Seña de reparación {numero}",
                "usuario_id": current_user["user_id"],
                "fecha": datetime.utcnow(),
            }}},
        )

    await registrar_auditoria(
        db=db,
        usuario_id=current_user["user_id"],
        usuario_nombre="",
        rol=current_user["role"],
        accion="crear",
        modulo="reparaciones",
        descripcion=f"Orden de reparación creada: {numero}"
    )

    return format_repair(new_repair)

@router.put("/{repair_id}")
async def update_repair(repair_id: str, repair: RepairUpdate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "reparaciones:update_estado")
    db = get_db()
    update_data = {k: v for k, v in repair.dict().items() if v is not None}

    # Si se actualizan los tipos recalcular precio
    if "tipos_reparacion" in update_data:
        precio_total = sum(t["precio"] for t in update_data["tipos_reparacion"])
        repair_doc = await db.reparaciones.find_one({"_id": ObjectId(repair_id)})
        total_pagado = repair_doc.get("total_pagado", 0)
        update_data["precio_total"] = precio_total
        update_data["saldo_pendiente"] = precio_total - total_pagado

    # Si se marca como entregada calcular garantía
    if "estado" in update_data and update_data["estado"] == "entregada":
        now = datetime.utcnow()
        update_data["fecha_entrega"] = now
        repair_doc = await db.reparaciones.find_one({"_id": ObjectId(repair_id)})
        garantia_dias = update_data.get("garantia_dias", repair_doc.get("garantia_dias", 90))
        update_data["fecha_vencimiento_garantia"] = now + timedelta(days=garantia_dias)

    # Si pasa de en_diagnostico a ingresada necesita tipos
    if "estado" in update_data and update_data["estado"] == "ingresada":
        repair_doc = await db.reparaciones.find_one({"_id": ObjectId(repair_id)})
        if not repair_doc.get("tipos_reparacion") and "tipos_reparacion" not in update_data:
            raise HTTPException(status_code=400, detail="Debe seleccionar al menos un tipo de reparación antes de cambiar el estado")

    await db.reparaciones.update_one({"_id": ObjectId(repair_id)}, {"$set": update_data})
    updated = await db.reparaciones.find_one({"_id": ObjectId(repair_id)})

    await registrar_auditoria(
    db=db,
    usuario_id=current_user["user_id"],
    usuario_nombre="",
    rol=current_user["role"],
    accion="actualizar",
    modulo="reparaciones",
    descripcion=f"Reparación actualizada: {repair_id}"
    )

    return format_repair(updated)

@router.post("/{repair_id}/pago")
async def add_payment(repair_id: str, pago: Pago, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "reparaciones:pago")
    db = get_db()

    # Verificar caja abierta
    sucursal = current_user["sucursales"][0]
    caja = await db.cajas.find_one({"estado": "abierta", "sucursal": sucursal})
    if not caja:
        raise HTTPException(status_code=400, detail="Debe haber una caja abierta para registrar el cobro")

    if not ObjectId.is_valid(repair_id):
        raise HTTPException(status_code=404, detail="Reparación no encontrada")
    repair = await db.reparaciones.find_one({"_id": ObjectId(repair_id)})
    if not repair:
        raise HTTPException(status_code=404, detail="Reparación no encontrada")
    if repair.get("estado") == "cancelada":
        raise HTTPException(status_code=400, detail="La orden está cancelada")
    if pago.metodo not in METODOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Medio de pago inválido")
    if pago.monto <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")
    saldo_actual = repair.get("precio_total", 0) - repair.get("total_pagado", 0)
    if pago.monto > saldo_actual + 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"El monto supera el saldo pendiente ($ {saldo_actual:,.2f})".replace(",", "X").replace(".", ",").replace("X", "."),
        )

    nuevo_pago = {
        **pago.dict(),
        "usuario_id": current_user["user_id"],
        "fecha": datetime.utcnow()
    }
    total_pagado = repair.get("total_pagado", 0) + pago.monto
    saldo = repair.get("precio_total", 0) - total_pagado

    await db.reparaciones.update_one(
        {"_id": ObjectId(repair_id)},
        {
            "$push": {"pagos": nuevo_pago},
            "$set": {
                "total_pagado": total_pagado,
                "saldo_pendiente": saldo
            }
        }
    )

    # Registrar en caja como movimiento
    movimiento_caja = {
        "tipo": "ingreso",
        "monto": pago.monto,
        "motivo": f"Reparación {repair.get('numero_orden', '')} — {pago.metodo}",
        "metodo_pago": pago.metodo,
        "concepto": "reparacion",
        "referencia_id": repair_id,
        "notas": f"Cobro de reparación {repair.get('numero_orden', '')}",
        "usuario_id": current_user["user_id"],
        "fecha": datetime.utcnow()
    }
    await db.cajas.update_one(
        {"_id": caja["_id"]},
        {"$push": {"movimientos": movimiento_caja}}
    )

    return {"message": "Pago registrado", "total_pagado": total_pagado, "saldo_pendiente": saldo}

@router.get("/cliente/{cliente_id}")
async def get_repairs_by_client(cliente_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "reparaciones:read")
    db = get_db()
    repairs = await db.reparaciones.find(
        {"cliente_id": cliente_id}
    ).sort("fecha_ingreso", -1).to_list(100)
    return [format_repair(r) for r in repairs]

@router.put("/{repair_id}/cancelar")
async def cancel_repair(repair_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "reparaciones:update_estado")
    db = get_db()
    if not ObjectId.is_valid(repair_id):
        raise HTTPException(status_code=404, detail="Reparación no encontrada")
    repair = await db.reparaciones.find_one({"_id": ObjectId(repair_id)})
    if not repair:
        raise HTTPException(status_code=404, detail="Reparación no encontrada")
    if repair["estado"] == "entregada":
        raise HTTPException(status_code=400, detail="No se puede cancelar una reparación ya entregada")
    if repair["estado"] == "cancelada":
        raise HTTPException(status_code=400, detail="La orden ya está cancelada")

    # Si hay pagos cobrados se devuelven: egreso de caja por cada pago, con su mismo medio de pago
    pagos = repair.get("pagos", [])
    total_devuelto = 0
    if pagos:
        caja = await caja_abierta_del_usuario(db, current_user)
        if not caja:
            raise HTTPException(
                status_code=400,
                detail="Esta orden tiene pagos cobrados. Para cancelarla hace falta una caja abierta, donde se registra la devolución.",
            )
        egresos = []
        for p in pagos:
            egresos.append({
                "tipo": "egreso",
                "monto": p["monto"],
                "motivo": f"Devolución orden {repair.get('numero_orden', '')} — {p['metodo']}",
                "metodo_pago": p["metodo"],
                "concepto": "devolucion_reparacion",
                "referencia_id": repair_id,
                "notas": f"Cancelación de la orden {repair.get('numero_orden', '')}",
                "usuario_id": current_user["user_id"],
                "fecha": datetime.utcnow(),
            })
            total_devuelto += p["monto"]
        await db.cajas.update_one({"_id": caja["_id"]}, {"$push": {"movimientos": {"$each": egresos}}})

    await db.reparaciones.update_one(
        {"_id": ObjectId(repair_id)},
        {"$set": {
            "estado": "cancelada",
            "saldo_pendiente": 0,
            "total_devuelto": total_devuelto,
            "fecha_cancelacion": datetime.utcnow(),
        }}
    )
    return {"message": "Reparación cancelada", "total_devuelto": total_devuelto}
