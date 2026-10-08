from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.repair import RepairCreate, RepairUpdate, Pago
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from bson import ObjectId
from datetime import datetime, timedelta
from app.routers.audit import registrar_auditoria

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
    numero = await get_next_number(db)
    precio_total = sum(t.precio for t in repair.tipos_reparacion)
    new_repair = {
        **repair.dict(),
        "numero_orden": numero,
        "precio_total": precio_total,
        "pagos": [],
        "total_pagado": 0,
        "saldo_pendiente": precio_total,
        "tecnico_id": None,
        "usuario_id": current_user["user_id"],
        "fecha_ingreso": datetime.utcnow(),
        "fecha_entrega": None,
        "fecha_vencimiento_garantia": None
    }
    result = await db.reparaciones.insert_one(new_repair)
    new_repair["_id"] = result.inserted_id

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

    repair = await db.reparaciones.find_one({"_id": ObjectId(repair_id)})
    if not repair:
        raise HTTPException(status_code=404, detail="Reparación no encontrada")

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
    repair = await db.reparaciones.find_one({"_id": ObjectId(repair_id)})
    if not repair:
        raise HTTPException(status_code=404, detail="Reparación no encontrada")
    if repair["estado"] == "entregada":
        raise HTTPException(status_code=400, detail="No se puede cancelar una reparación ya entregada")
    await db.reparaciones.update_one(
        {"_id": ObjectId(repair_id)},
        {"$set": {"estado": "cancelada"}}
    )
    return {"message": "Reparación cancelada"}