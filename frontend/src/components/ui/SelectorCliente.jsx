import { useState, useRef, useEffect } from "react";
import { Search, X, User } from "lucide-react";

// Selector de cliente con búsqueda. value = id del cliente ("" = consumidor final)
export default function SelectorCliente({
  clientes,
  value,
  onChange,
  textoVacio = "Consumidor final",
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const ref = useRef(null);

  const seleccionado = clientes.find((c) => c.id === value);

  useEffect(() => {
    const clickAfuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", clickAfuera);
    return () => document.removeEventListener("mousedown", clickAfuera);
  }, []);

  const termino = busqueda.trim().toLowerCase();
  const coincidencias = clientes
    .filter((c) =>
      `${c.nombre} ${c.apellido || ""} ${c.telefono || ""} ${c.dni || ""}`
        .toLowerCase()
        .includes(termino),
    )
    .slice(0, 6);

  const elegir = (id) => {
    onChange(id);
    setBusqueda("");
    setAbierto(false);
  };

  return (
    <div ref={ref} className="relative">
      {seleccionado ? (
        <div className="flex items-center justify-between px-3 py-2 border border-blue-200 bg-blue-50 rounded-xl text-sm">
          <span className="flex items-center gap-2 text-blue-800 font-medium">
            <User size={14} />
            {seleccionado.nombre} {seleccionado.apellido}
          </span>
          <button
            type="button"
            onClick={() => elegir("")}
            title="Quitar cliente"
            className="p-1 text-blue-400 hover:text-blue-700"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={busqueda}
            onFocus={() => setAbierto(true)}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setAbierto(true);
            }}
            placeholder={`${textoVacio} · buscar cliente...`}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {abierto && !seleccionado && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => elegir("")}
            className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
          >
            {textoVacio}
          </button>
          {coincidencias.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-400 text-center">
              No se encontraron clientes
            </p>
          ) : (
            coincidencias.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => elegir(c.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="text-gray-800">
                  {c.nombre} {c.apellido}
                </span>
                {c.telefono && (
                  <span className="text-xs text-gray-400 ml-2">
                    {c.telefono}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
