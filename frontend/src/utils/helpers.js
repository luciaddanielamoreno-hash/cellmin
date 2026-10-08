export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
};

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const ROLES = {
  ADMINISTRADOR: "administrador",
  CAJERO: "cajero",
  VENDEDOR: "vendedor",
  DEPOSITO: "deposito",
};

export const ESTADOS_REPARACION = {
  ingresada: { label: "Ingresada", color: "bg-blue-100 text-blue-800" },
  en_reparacion: {
    label: "En Reparación",
    color: "bg-yellow-100 text-yellow-800",
  },
  lista: { label: "Lista para Entregar", color: "bg-green-100 text-green-800" },
  entregada: { label: "Entregada", color: "bg-gray-100 text-gray-800" },
};

export const ESTADOS_REP = {
  en_diagnostico: {
    label: "En diagnóstico",
    color: "bg-gray-100 text-gray-700",
  },
  ingresada: { label: "Ingresada", color: "bg-blue-100 text-blue-700" },
  en_reparacion: {
    label: "En reparación",
    color: "bg-yellow-100 text-yellow-700",
  },
  lista: { label: "Lista para entregar", color: "bg-green-100 text-green-700" },
  entregada: { label: "Entregada", color: "bg-gray-100 text-gray-500" },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

export const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
];

export const SUCURSALES = [
  { value: "sucursal_1", label: "Sucursal 1" },
  { value: "sucursal_2", label: "Sucursal 2" },
];

export const formatInputMoneda = (valor) => {
  // Permitir solo números, punto y coma
  const limpio = valor.replace(/[^\d.,]/g, "");

  // Separar parte entera y decimal
  const partes = limpio.replace(",", ".").split(".");
  const entera = partes[0].replace(/\./g, "");
  const decimal = partes.length > 1 ? partes[1].slice(0, 2) : null;

  // Formatear parte entera con puntos de miles
  const enteraFormateada = entera
    ? new Intl.NumberFormat("es-AR").format(parseInt(entera))
    : "";

  return decimal !== null ? `${enteraFormateada},${decimal}` : enteraFormateada;
};

export const parsearMoneda = (valor) => {
  if (!valor) return 0;
  // Quitar puntos de miles y reemplazar coma decimal por punto
  const limpio = valor.replace(/\./g, "").replace(",", ".");
  return parseFloat(limpio) || 0;
};

// Interpreta el texto guardado en venta.metodo_pago.
// Pago simple: "efectivo"
// Pago mixto:  "efectivo: $ 10.000,00 + transferencia: $ 10.000,00"
export const parsearMetodoPago = (texto) => {
  if (!texto) return { esMixto: false, partes: [] };
  const partes = texto.split(" + ").map((parte) => {
    const [metodo, ...resto] = parte.split(": ");
    const clave = metodo.trim();
    const info = METODOS_PAGO.find((m) => m.value === clave);
    return {
      metodo: info ? info.label : clave,
      monto: resto.length ? resto.join(": ") : null,
    };
  });
  return { esMixto: partes.length > 1, partes };
};
