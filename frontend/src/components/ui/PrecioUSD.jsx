import { useCotizacion } from "../../hooks/useCotizacion";
import { formatUSD } from "../../utils/helpers";

// Equivalente en dólares de un monto en pesos, en letra chica.
// Si no hay cotización disponible no muestra nada.
export default function PrecioUSD({ pesos, className = "", prefijo = "≈" }) {
  const { aUSD } = useCotizacion();
  const usd = aUSD(Number(pesos) || 0);
  if (usd === null) return null;
  return (
    <span className={`text-xs font-normal text-gray-400 ${className}`}>
      {prefijo} {formatUSD(usd)}
    </span>
  );
}
