import { useState } from "react";
import InputNumero from "./InputNumero";
import { useCotizacion } from "../../hooks/useCotizacion";
import { formatCurrency, formatUSD } from "../../utils/helpers";

// Precio que se puede cargar en pesos o en dólares.
// - `pesos` es siempre el valor real (lo que se guarda).
// - moneda "ars": se escribe en pesos y debajo se ve el equivalente en USD.
// - moneda "usd": se escribe en dólares y debajo se ve el equivalente en pesos,
//   calculado con el dólar blue (venta) del momento.
// Para que el campo se reinicie al cambiar de moneda, el padre debe usar
// key={moneda}.
export default function InputPrecio({
  pesos,
  onChange,
  moneda = "ars",
  className = "",
  ...resto
}) {
  const { aUSD, aPesos } = useCotizacion();
  const esUSD = moneda === "usd";
  const [usd, setUsd] = useState(() => {
    if (!esUSD || pesos === "" || pesos == null) return "";
    const v = aUSD(Number(pesos));
    return v === null ? "" : Math.round(v * 100) / 100;
  });

  const cambiarUSD = (valor) => {
    setUsd(valor);
    if (valor === "") return onChange("");
    const p = aPesos(valor);
    if (p !== null) onChange(p);
  };

  const equivalente = esUSD
    ? pesos !== "" && pesos != null
      ? `= ${formatCurrency(pesos)}`
      : null
    : (() => {
        const v = aUSD(Number(pesos) || 0);
        return pesos !== "" && pesos != null && v !== null
          ? `≈ ${formatUSD(v)}`
          : null;
      })();

  return (
    <div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium pointer-events-none">
          {esUSD ? "US$" : "$"}
        </span>
        <InputNumero
          {...resto}
          value={esUSD ? usd : pesos}
          onChange={esUSD ? cambiarUSD : onChange}
          className={`${className} pl-9`}
        />
      </div>
      {equivalente && (
        <p className="text-[11px] text-gray-400 mt-0.5">{equivalente}</p>
      )}
    </div>
  );
}

// Selector de la moneda en la que se cargan los precios
export function SelectorMoneda({ moneda, onChange }) {
  const { disponible, venta } = useCotizacion();
  const opciones = [
    { v: "ars", t: "Pesos ($)" },
    { v: "usd", t: "Dólares (US$)" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-gray-600">Cargar precios en:</span>
      <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
        {opciones.map((o) => (
          <button
            key={o.v}
            type="button"
            disabled={o.v === "usd" && !disponible}
            onClick={() => onChange(o.v)}
            className={`px-3 py-1 transition disabled:opacity-40 disabled:cursor-not-allowed ${
              moneda === o.v
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {o.t}
          </button>
        ))}
      </div>
      {disponible ? (
        <span className="text-gray-400">
          Dólar blue $ {new Intl.NumberFormat("es-AR").format(venta)}
        </span>
      ) : (
        <span className="text-red-500">
          Sin cotización: solo se puede cargar en pesos
        </span>
      )}
    </div>
  );
}
