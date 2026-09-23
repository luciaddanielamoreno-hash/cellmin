from fastapi import APIRouter, Depends
from app.database import get_db
from app.utils.auth import get_current_user
from app.utils.permissions import check_permission
from datetime import datetime, timedelta


router = APIRouter()

@router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "dashboard:read")
    db = get_db()
    hoy = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ventas_hoy = await db.ventas.find({
        "estado": "completada",
        "fecha": {"$gte": hoy}
    }).to_list(1000)
    total_hoy = sum(v["total"] for v in ventas_hoy)
    reparaciones_activas = await db.reparaciones.count_documents({
        "estado": {"$in": ["en_diagnostico", "ingresada", "en_reparacion", "lista"]}
    })
    stock_bajo = await db.productos.count_documents({
        "$expr": {"$lt": ["$stock_actual", "$stock_minimo"]},
        "activo": True
    })
    total_clientes = await db.clientes.count_documents({"activo": True})
    return {
        "ventas_hoy": len(ventas_hoy),
        "total_ventas_hoy": total_hoy,
        "reparaciones_activas": reparaciones_activas,
        "stock_bajo": stock_bajo,
        "total_clientes": total_clientes,
    }

@router.get("/ventas")
async def get_ventas_report(
    periodo: str = "mes",
    desde: str = None,
    hasta: str = None,
    current_user: dict = Depends(get_current_user)
):
    check_permission(current_user["role"], "*")
    db = get_db()
    hoy = datetime.utcnow()

    if desde and hasta:
        fecha_desde = datetime.strptime(desde, "%Y-%m-%d")
        fecha_hasta = datetime.strptime(hasta, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    else:
        if periodo == "dia":
            fecha_desde = hoy.replace(hour=0, minute=0, second=0, microsecond=0)
        elif periodo == "semana":
            fecha_desde = hoy - timedelta(days=7)
        elif periodo == "mes":
            fecha_desde = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif periodo == "año":
            fecha_desde = hoy.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            fecha_desde = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        fecha_hasta = hoy

    ventas = await db.ventas.find({
    "fecha": {"$gte": fecha_desde, "$lte": fecha_hasta}
    }).to_list(5000)

    ventas_completadas = [v for v in ventas if v["estado"] == "completada"]
    ventas_canceladas = [v for v in ventas if v["estado"] == "cancelada"]

    total = sum(v["total"] for v in ventas_completadas)
    total_descuentos = sum(v.get("descuento", 0) for v in ventas_completadas)

    por_dia = {}
    for v in ventas:
        dia = v["fecha"].strftime("%Y-%m-%d") if hasattr(v["fecha"], "strftime") else str(v["fecha"])[:10]
        por_dia[dia] = por_dia.get(dia, 0) + v["total"]

    por_metodo = {}
    for v in ventas:
        metodo = v.get("metodo_pago", "efectivo")
        if "+" in metodo:
            metodo = "mixto"
        por_metodo[metodo] = por_metodo.get(metodo, 0) + v["total"]

    por_sucursal = {}
    for v in ventas:
        suc = v.get("sucursal", "sucursal_1")
        por_sucursal[suc] = por_sucursal.get(suc, 0) + v["total"]

    return {
        "periodo": periodo,
        "desde": fecha_desde,
        "hasta": fecha_hasta,
        "cantidad_ventas": len(ventas_completadas),
        "cantidad_canceladas": len(ventas_canceladas),
        "total": total,
        "total_descuentos": total_descuentos,
        "por_dia": [{"fecha": k, "total": v} for k, v in sorted(por_dia.items())],
        "por_metodo": [{"metodo": k, "total": v} for k, v in por_metodo.items()],
        "por_sucursal": [{"sucursal": k, "total": v} for k, v in por_sucursal.items()],
    }
    check_permission(current_user["role"], "*")
    db = get_db()
    hoy = datetime.utcnow()
    if periodo == "dia":
        desde = hoy.replace(hour=0, minute=0, second=0, microsecond=0)
    elif periodo == "semana":
        desde = hoy - timedelta(days=7)
    elif periodo == "mes":
        desde = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif periodo == "año":
        desde = hoy.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        desde = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    ventas = await db.ventas.find({
        "estado": "completada",
        "fecha": {"$gte": desde}
    }).to_list(5000)

    total = sum(v["total"] for v in ventas)
    total_descuentos = sum(v.get("descuento", 0) for v in ventas)

    # Agrupar por día
    por_dia = {}
    for v in ventas:
        dia = v["fecha"].strftime("%Y-%m-%d") if hasattr(v["fecha"], "strftime") else str(v["fecha"])[:10]
        por_dia[dia] = por_dia.get(dia, 0) + v["total"]

    # Agrupar por método de pago
    por_metodo = {}
    for v in ventas:
        metodo = v.get("metodo_pago", "efectivo")
        if "+" in metodo:
            metodo = "mixto"
        por_metodo[metodo] = por_metodo.get(metodo, 0) + v["total"]

    # Agrupar por sucursal
    por_sucursal = {}
    for v in ventas:
        suc = v.get("sucursal", "sucursal_1")
        por_sucursal[suc] = por_sucursal.get(suc, 0) + v["total"]

    return {
        "periodo": periodo,
        "desde": desde,
        "cantidad_ventas": len(ventas),
        "total": total,
        "total_descuentos": total_descuentos,
        "por_dia": [{"fecha": k, "total": v} for k, v in sorted(por_dia.items())],
        "por_metodo": [{"metodo": k, "total": v} for k, v in por_metodo.items()],
        "por_sucursal": [{"sucursal": k, "total": v} for k, v in por_sucursal.items()],
    }

@router.get("/productos-vendidos")
async def get_top_products(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    pipeline = [
        {"$match": {"estado": "completada"}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.producto_id",
            "nombre": {"$first": "$items.nombre_producto"},
            "cantidad_total": {"$sum": "$items.cantidad"},
            "total_vendido": {"$sum": "$items.subtotal"}
        }},
        {"$sort": {"cantidad_total": -1}},
        {"$limit": 10}
    ]
    result = await db.ventas.aggregate(pipeline).to_list(10)
    return result

@router.get("/rentabilidad")
async def get_rentabilidad(
    periodo: str = "mes",
    desde: str = None,
    hasta: str = None,
    current_user: dict = Depends(get_current_user)
):
    check_permission(current_user["role"], "*")
    db = get_db()
    hoy = datetime.utcnow()

    if desde and hasta:
        fecha_desde = datetime.strptime(desde, "%Y-%m-%d")
        fecha_hasta = datetime.strptime(hasta, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    else:
        if periodo == "dia":
            fecha_desde = hoy.replace(hour=0, minute=0, second=0, microsecond=0)
        elif periodo == "semana":
            fecha_desde = hoy - timedelta(days=7)
        elif periodo == "mes":
            fecha_desde = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif periodo == "año":
            fecha_desde = hoy.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            fecha_desde = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        fecha_hasta = hoy

    ventas = await db.ventas.find({
        "estado": "completada",
        "fecha": {"$gte": fecha_desde, "$lte": fecha_hasta}
    }).to_list(5000)

    total_ingresos = sum(v["total"] for v in ventas)
    total_costo = 0
    for v in ventas:
        for item in v.get("items", []):
            producto = await db.productos.find_one({"_id": __import__('bson').ObjectId(item["producto_id"])})
            if producto:
                if item.get("variante_nombre") and producto.get("variantes"):
                    variante = next((var for var in producto["variantes"] if var["nombre"] == item["variante_nombre"]), None)
                    if variante:
                        total_costo += variante.get("precio_costo", 0) * item["cantidad"]
                else:
                    total_costo += producto.get("precio_costo", 0) * item["cantidad"]

    ganancia = total_ingresos - total_costo
    margen = (ganancia / total_ingresos * 100) if total_ingresos > 0 else 0

    return {
        "periodo": periodo,
        "total_ingresos": total_ingresos,
        "total_costo": total_costo,
        "ganancia": ganancia,
        "margen_porcentual": round(margen, 2),
    }
    check_permission(current_user["role"], "*")
    db = get_db()
    hoy = datetime.utcnow()
    if periodo == "dia":
        desde = hoy.replace(hour=0, minute=0, second=0, microsecond=0)
    elif periodo == "semana":
        desde = hoy - timedelta(days=7)
    elif periodo == "mes":
        desde = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif periodo == "año":
        desde = hoy.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        desde = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    ventas = await db.ventas.find({
        "estado": "completada",
        "fecha": {"$gte": desde}
    }).to_list(5000)

    total_ingresos = sum(v["total"] for v in ventas)

    # Calcular costo de los productos vendidos
    total_costo = 0
    for v in ventas:
        for item in v.get("items", []):
            producto = await db.productos.find_one({"_id": __import__('bson').ObjectId(item["producto_id"])})
            if producto:
                if item.get("variante_nombre") and producto.get("variantes"):
                    variante = next((var for var in producto["variantes"] if var["nombre"] == item["variante_nombre"]), None)
                    if variante:
                        total_costo += variante.get("precio_costo", 0) * item["cantidad"]
                else:
                    total_costo += producto.get("precio_costo", 0) * item["cantidad"]

    ganancia = total_ingresos - total_costo
    margen = (ganancia / total_ingresos * 100) if total_ingresos > 0 else 0

    return {
        "periodo": periodo,
        "total_ingresos": total_ingresos,
        "total_costo": total_costo,
        "ganancia": ganancia,
        "margen_porcentual": round(margen, 2),
    }

@router.get("/reparaciones")
async def get_reparaciones_report(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    total = await db.reparaciones.count_documents({})
    por_estado = {}
    for estado in ["en_diagnostico", "ingresada", "en_reparacion", "lista", "entregada", "cancelada"]:
        count = await db.reparaciones.count_documents({"estado": estado})
        por_estado[estado] = count

    reparaciones = await db.reparaciones.find({}).to_list(5000)
    total_facturado = sum(r.get("precio_total", 0) for r in reparaciones if r.get("estado") == "entregada")
    total_cobrado = sum(r.get("total_pagado", 0) for r in reparaciones)
    total_pendiente = sum(r.get("saldo_pendiente", 0) for r in reparaciones if r.get("estado") not in ["entregada", "cancelada"])
    total_canceladas = await db.reparaciones.count_documents({"estado": "cancelada"})

    return {
        "total": total,
        "por_estado": por_estado,
        "total_facturado": total_facturado,
        "total_cobrado": total_cobrado,
        "total_pendiente": total_pendiente,
        "total_canceladas": total_canceladas,
    }

@router.get("/stock-bajo")
async def get_stock_bajo(current_user: dict = Depends(get_current_user)):
    check_permission(current_user["role"], "*")
    db = get_db()
    productos = await db.productos.find({"activo": True}).to_list(1000)
    resultado = []
    for p in productos:
        if p.get("tiene_variantes"):
            for v in p.get("variantes", []):
                if v.get("stock_actual", 0) < v.get("stock_minimo", 0):
                    resultado.append({
                        "nombre": p["nombre"],
                        "variante": v["nombre"],
                        "stock_actual": v.get("stock_actual", 0),
                        "stock_minimo": v.get("stock_minimo", 0),
                    })
        else:
            if p.get("stock_actual", 0) < p.get("stock_minimo", 0):
                resultado.append({
                    "nombre": p["nombre"],
                    "variante": None,
                    "stock_actual": p.get("stock_actual", 0),
                    "stock_minimo": p.get("stock_minimo", 0),
                })
    return resultado