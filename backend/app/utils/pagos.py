"""Cobros en dólares: el dinero se registra siempre en pesos, y además se
guardan los dólares recibidos y la cotización usada, para poder contar los
billetes en el cierre de caja."""
from datetime import datetime
from fastapi import HTTPException
from app.utils.cotizacion import cotizacion_venta

USD = "usd"
METODOS_VALIDOS = ("efectivo", "transferencia", "debito", "credito", USD)


def redondear(valor: float) -> float:
    return round(valor + 1e-9, 2)


def formato_usd(monto: float) -> str:
    # 10.5 -> "US$ 10,50" (mismo formato que el frontend)
    texto = f"{monto:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"US$ {texto}"


async def cotizacion_para_cobro(db) -> float:
    """Dólar blue (venta) con el que se convierte el cobro. Sin cotización
    no se puede cobrar en dólares."""
    valor = await cotizacion_venta(db)
    if not valor:
        raise HTTPException(
            status_code=400,
            detail="No hay cotización del dólar disponible, por ahora no se puede cobrar en dólares.",
        )
    return valor


def movimiento_vuelto(monto: float, referencia: str, referencia_id: str, usuario_id: str) -> dict:
    """Egreso de caja por el vuelto en pesos que se entrega al cobrar en dólares."""
    return {
        "tipo": "egreso",
        "monto": monto,
        "motivo": f"Vuelto {referencia}",
        "metodo_pago": "efectivo",
        "concepto": "vuelto",
        "referencia_id": referencia_id,
        "notas": f"Vuelto en pesos de {referencia}",
        "usuario_id": usuario_id,
        "fecha": datetime.utcnow(),
    }


def pagos_de_venta(venta: dict) -> list:
    """Cómo se pagó la venta, por método. Las ventas nuevas guardan 'pagos';
    en las viejas se reconstruye desde el texto de metodo_pago."""
    if venta.get("pagos"):
        return venta["pagos"]
    texto = venta.get("metodo_pago", "efectivo")
    if "+" not in texto:
        return [{"metodo": texto, "monto": venta["total"]}]
    pagos = []
    for parte in texto.split("+"):
        if ":" not in parte:
            continue
        metodo, monto_txt = parte.split(":", 1)
        try:
            monto = float(monto_txt.replace("$", "").replace(".", "").replace(",", ".").strip())
        except ValueError:
            continue
        pagos.append({"metodo": metodo.strip(), "monto": monto})
    return pagos
