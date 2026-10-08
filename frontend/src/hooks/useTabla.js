import { useState, useEffect } from "react";

const esVacio = (v) => v === null || v === undefined || v === "";

const comparar = (a, b) => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", {
    numeric: true,
    sensitivity: "base",
  });
};

/**
 * Ordena y pagina una lista para mostrarla en una tabla.
 *
 * datos        lista ya filtrada
 * porPagina    filas por página
 * accessors    { campo: (fila) => valor } para columnas que no son un campo directo
 * ordenInicial { campo, dir: "asc" | "desc" } o null (respeta el orden original)
 */
export function useTabla(
  datos,
  { porPagina = 20, accessors = {}, ordenInicial = null } = {},
) {
  const [orden, setOrden] = useState(ordenInicial);
  const [pagina, setPagina] = useState(1);

  // Al filtrar (cambia la cantidad) o reordenar, volver a la primera página
  useEffect(() => {
    setPagina(1);
  }, [datos.length, orden?.campo, orden?.dir]);

  const ordenados = orden
    ? [...datos].sort((x, y) => {
        const leer = accessors[orden.campo] || ((fila) => fila[orden.campo]);
        const a = leer(x);
        const b = leer(y);
        // Los vacíos siempre van al final, sin importar el sentido
        if (esVacio(a) && esVacio(b)) return 0;
        if (esVacio(a)) return 1;
        if (esVacio(b)) return -1;
        return orden.dir === "asc" ? comparar(a, b) : comparar(b, a);
      })
    : datos;

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const filas = ordenados.slice(
    (paginaSegura - 1) * porPagina,
    paginaSegura * porPagina,
  );

  // Primer clic en una columna: ascendente. Clic en la misma: sentido contrario.
  const alternarOrden = (campo) =>
    setOrden((actual) =>
      actual?.campo === campo
        ? { campo, dir: actual.dir === "asc" ? "desc" : "asc" }
        : { campo, dir: "asc" },
    );

  return {
    filas,
    total: ordenados.length,
    pagina: paginaSegura,
    setPagina,
    porPagina,
    orden,
    alternarOrden,
  };
}
