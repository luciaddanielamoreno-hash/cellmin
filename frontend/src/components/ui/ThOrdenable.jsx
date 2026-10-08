import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

// Encabezado de columna que se puede tocar para ordenar.
// Uso: <ThOrdenable campo="total" tabla={tabla} align="center">Total</ThOrdenable>
export default function ThOrdenable({
  campo,
  tabla,
  align = "left",
  className = "px-6 py-3",
  children,
}) {
  const activo = tabla.orden?.campo === campo;
  const dir = activo ? tabla.orden.dir : null;
  const Icono = !activo ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      aria-sort={
        !activo ? "none" : dir === "asc" ? "ascending" : "descending"
      }
      className={`${className} ${
        align === "center" ? "text-center" : "text-left"
      } text-xs font-medium uppercase`}
    >
      <button
        type="button"
        onClick={() => tabla.alternarOrden(campo)}
        title="Ordenar"
        className={`inline-flex items-center gap-1 uppercase transition hover:text-gray-800 ${
          activo ? "text-blue-600" : "text-gray-500"
        }`}
      >
        {children}
        <Icono size={12} className={activo ? "" : "opacity-40"} />
      </button>
    </th>
  );
}
