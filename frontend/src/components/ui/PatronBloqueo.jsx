// Grilla 3x3 para cargar o mostrar el patrón de desbloqueo.
// value: "1-5-9-6" (puntos del 1 al 9, de izquierda a derecha y de arriba hacia abajo)
const CENTROS = [30, 90, 150];

const posicion = (n) => ({
  x: CENTROS[(n - 1) % 3],
  y: CENTROS[Math.floor((n - 1) / 3)],
});

export default function PatronBloqueo({ value = "", onChange, readOnly = false }) {
  const puntos = value ? value.split("-").map(Number).filter(Boolean) : [];

  const tocar = (n) => {
    if (readOnly) return;
    if (puntos.includes(n)) {
      // Tocar el último punto lo quita (deshacer)
      if (puntos[puntos.length - 1] === n) {
        onChange(puntos.slice(0, -1).join("-"));
      }
      return;
    }
    onChange([...puntos, n].join("-"));
  };

  const recorrido = puntos.map((n) => `${posicion(n).x},${posicion(n).y}`).join(" ");

  return (
    <div className="inline-block">
      <div
        className={`relative bg-gray-50 border border-gray-200 rounded-xl ${
          readOnly ? "w-[120px] h-[120px]" : "w-[180px] h-[180px]"
        }`}
      >
        <svg
          viewBox="0 0 180 180"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {puntos.length > 1 && (
            <polyline
              points={recorrido}
              fill="none"
              stroke="#2563eb"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.6"
            />
          )}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            const { x, y } = posicion(n);
            const orden = puntos.indexOf(n) + 1;
            return (
              <g key={n}>
                <circle
                  cx={x}
                  cy={y}
                  r={orden ? 15 : 8}
                  fill={orden ? "#2563eb" : "#9ca3af"}
                />
                {orden > 0 && (
                  <text
                    x={x}
                    y={y + 5}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="700"
                    fill="#fff"
                  >
                    {orden}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {!readOnly &&
          [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            const { x, y } = posicion(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => tocar(n)}
                aria-label={`Punto ${n}`}
                className="absolute w-10 h-10 rounded-full hover:bg-blue-100/60"
                style={{ left: x - 20, top: y - 20 }}
              />
            );
          })}
      </div>
      {!readOnly && (
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-gray-500">
            {puntos.length === 0
              ? "Tocá los puntos en orden"
              : `${puntos.length} punto${puntos.length === 1 ? "" : "s"}${puntos.length < 4 ? " (mínimo 4)" : ""}`}
          </span>
          {puntos.length > 0 && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-blue-600 hover:underline"
            >
              Borrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
