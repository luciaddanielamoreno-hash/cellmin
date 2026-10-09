import { useState, useRef, useEffect } from "react";
import { Search, X, Tag } from "lucide-react";

// Selector de categoría con búsqueda. Solo ofrece categorías activas.
// value = id de la categoría ("" = ninguna). Si el valor actual es una
// categoría que luego se desactivó, se muestra seleccionada pero no se
// puede volver a elegir.
export default function SelectorCategoria({
  categorias,
  value,
  onChange,
  textoVacio = "Seleccionar categoría",
  permitirVacio = false,
  excluirId = null,
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const ref = useRef(null);

  const seleccionada = categorias.find((c) => c.id === value);

  useEffect(() => {
    const clickAfuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", clickAfuera);
    return () => document.removeEventListener("mousedown", clickAfuera);
  }, []);

  const termino = busqueda.trim().toLowerCase();
  const coincidencias = categorias
    .filter((c) => c.activo !== false && c.id !== excluirId)
    .filter((c) => c.nombre.toLowerCase().includes(termino))
    .slice(0, 8);

  const elegir = (id) => {
    onChange(id);
    setBusqueda("");
    setAbierto(false);
  };

  return (
    <div ref={ref} className="relative">
      {seleccionada ? (
        <div className="flex items-center justify-between px-3 py-2 border border-blue-200 bg-blue-50 rounded-xl text-sm">
          <span className="flex items-center gap-2 text-blue-800 font-medium">
            <Tag size={14} />
            {seleccionada.nombre}
            {seleccionada.activo === false && (
              <span className="text-xs font-normal text-red-500">
                (inactiva)
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => elegir("")}
            title="Cambiar categoría"
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
            placeholder={`${textoVacio} · buscar...`}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {abierto && !seleccionada && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
          {permitirVacio && (
            <button
              type="button"
              onClick={() => elegir("")}
              className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
            >
              {textoVacio}
            </button>
          )}
          {coincidencias.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-400 text-center">
              No se encontraron categorías activas
            </p>
          ) : (
            coincidencias.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => elegir(c.id)}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
              >
                {c.nombre}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
