import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

// Menú de tres puntitos. Se posiciona con "fixed" para que no lo recorte
// el overflow de las tablas.
export default function MenuAcciones({ acciones }) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const botonRef = useRef(null);
  const menuRef = useRef(null);

  const visibles = acciones.filter(Boolean);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setAbierto(false);
    const clickAfuera = (e) => {
      if (
        menuRef.current?.contains(e.target) ||
        botonRef.current?.contains(e.target)
      )
        return;
      cerrar();
    };
    const tecla = (e) => e.key === "Escape" && cerrar();
    document.addEventListener("mousedown", clickAfuera);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("mousedown", clickAfuera);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto]);

  // Se mide el menú real antes de pintarlo, así nunca aparece en una
  // posición provisoria ni estira la página.
  useLayoutEffect(() => {
    if (!abierto || !botonRef.current || !menuRef.current) return;
    const r = botonRef.current.getBoundingClientRect();
    const alto = menuRef.current.offsetHeight;
    const abajoLibre = window.innerHeight - r.bottom - 8;
    setPos({
      top: abajoLibre < alto ? Math.max(8, r.top - alto - 4) : r.bottom + 4,
      right: Math.max(8, window.innerWidth - r.right),
      listo: true,
    });
  }, [abierto]);

  const toggle = () => {
    setPos({ top: 0, right: 0, listo: false });
    setAbierto(!abierto);
  };

  if (visibles.length === 0) return null;

  return (
    <>
      <button
        ref={botonRef}
        onClick={toggle}
        title="Acciones"
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
      >
        <MoreVertical size={16} />
      </button>
      {abierto &&
        createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            visibility: pos.listo ? "visible" : "hidden",
          }}
          className="z-50 overflow-hidden min-w-[210px] bg-white border border-gray-200 rounded-xl shadow-lg py-1"
        >
          {visibles.map((a, i) => (
            <button
              key={i}
              onClick={() => {
                setAbierto(false);
                a.onClick();
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition ${
                a.peligro
                  ? "text-red-600 hover:bg-red-50"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {a.icono}
              {a.label}
            </button>
          ))}
        </div>,
          document.body,
        )}
    </>
  );
}
