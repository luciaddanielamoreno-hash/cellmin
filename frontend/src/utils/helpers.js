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
