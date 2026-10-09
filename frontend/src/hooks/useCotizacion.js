import { useState, useEffect } from "react";
import { cotizacionService } from "../services/cotizacion.service";

// Cotización compartida por toda la app: se pide una sola vez y se
// refresca cada 5 minutos, sin importar cuántos componentes la usen.
const SIN_DATOS = {
  disponible: false,
  venta: null,
  fecha: null,
  obsoleta: false,
  cargado: false, // true cuando ya se intentó pedir la cotización
};
let estado = SIN_DATOS;
let cargando = false;
let temporizador = null;
const oyentes = new Set();

const avisar = () => oyentes.forEach((fn) => fn(estado));

const cargar = async () => {
  if (cargando) return;
  cargando = true;
  try {
    estado = { ...(await cotizacionService.get()), cargado: true };
  } catch {
    // Si falla el pedido se conserva el último valor que ya teníamos
    console.warn("No se pudo obtener la cotización del dólar");
    estado = estado.disponible
      ? { ...estado, obsoleta: true }
      : { ...SIN_DATOS, cargado: true };
  } finally {
    cargando = false;
    avisar();
  }
};

export function useCotizacion() {
  const [datos, setDatos] = useState(estado);

  useEffect(() => {
    oyentes.add(setDatos);
    if (oyentes.size === 1) {
      cargar();
      temporizador = setInterval(cargar, 5 * 60 * 1000);
    } else {
      setDatos(estado);
    }
    return () => {
      oyentes.delete(setDatos);
      if (oyentes.size === 0 && temporizador) {
        clearInterval(temporizador);
        temporizador = null;
      }
    };
  }, []);

  return {
    ...datos,
    // pesos -> dólares con la cotización actual (null si no hay cotización)
    aUSD: (pesos) =>
      datos.disponible && datos.venta ? pesos / datos.venta : null,
    // dólares -> pesos
    aPesos: (usd) =>
      datos.disponible && datos.venta
        ? Math.round(usd * datos.venta * 100) / 100
        : null,
  };
}
