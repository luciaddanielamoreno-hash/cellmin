import { useState, useRef, useLayoutEffect, useEffect } from "react";

// Campo numérico con formato argentino mientras se escribe:
// 800000 -> 800.000   y   1500,5 -> 1.500,5   (al salir del campo: 1.500,50)
// - La coma es el separador decimal. El punto del teclado numérico también.
// - onChange recibe un número (o "" si el campo está vacío).
// - decimales = 0 para cantidades enteras (stock, días, unidades).

const conMiles = (digitos) => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Texto crudo (lo que haya en el input) -> { texto formateado, número }
function interpretar(crudo, decimales) {
  const limpio = String(crudo).replace(/[^\d,]/g, "");
  const i = limpio.indexOf(",");
  let entera = i === -1 ? limpio : limpio.slice(0, i);
  entera = entera.replace(/^0+(?=\d)/, "");
  const hayComa = i !== -1 && decimales > 0;
  const decimal = hayComa
    ? limpio
        .slice(i + 1)
        .replace(/,/g, "")
        .slice(0, decimales)
    : "";
  if (entera === "" && !hayComa) return { texto: "", numero: "" };
  const texto =
    (entera === "" ? "0" : conMiles(entera)) + (hayComa ? "," + decimal : "");
  return {
    texto,
    numero: parseFloat((entera || "0") + (decimal ? "." + decimal : "")),
  };
}

// Número -> texto, para mostrar un valor que viene de afuera
function aTexto(valor, decimales, completar) {
  if (valor === "" || valor == null) return "";
  const n = Number(valor);
  if (!isFinite(n)) return "";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: completar ? decimales : 0,
    maximumFractionDigits: decimales,
  }).format(n);
}

export default function InputNumero({
  value,
  onChange,
  decimales = 2,
  completarDecimales = true,
  max,
  className = "",
  ...resto
}) {
  const [texto, setTexto] = useState(() =>
    aTexto(value, decimales, completarDecimales),
  );
  const [enfocado, setEnfocado] = useState(false);
  const ref = useRef(null);
  const cursor = useRef(null);

  // Si el valor cambia desde afuera (otro campo, reset, carga de datos)
  // se actualiza el texto, salvo que ya represente ese mismo número.
  useEffect(() => {
    const actual = interpretar(texto, decimales).numero;
    const externo = value === "" || value == null || isNaN(value) ? "" : Number(value);
    if (actual !== externo) {
      setTexto(aTexto(externo, decimales, completarDecimales && !enfocado));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Devuelve el cursor a su lugar después de reformatear
  useLayoutEffect(() => {
    if (cursor.current != null && ref.current) {
      ref.current.setSelectionRange(cursor.current, cursor.current);
      cursor.current = null;
    }
  });

  const procesar = (crudo, posicion) => {
    let { texto: nuevo, numero } = interpretar(crudo, decimales);
    if (max !== undefined && numero !== "" && numero > Number(max)) {
      numero = Number(max);
      nuevo = aTexto(numero, decimales, false);
      posicion = null;
    }
    if (posicion != null) {
      // Se cuentan los dígitos/coma que había antes del cursor y se
      // busca la misma posición en el texto ya formateado.
      const significativos = crudo.slice(0, posicion).replace(/[^\d,]/g, "")
        .length;
      let vistos = 0;
      let nueva = 0;
      while (nueva < nuevo.length && vistos < significativos) {
        if (nuevo[nueva] !== ".") vistos++;
        nueva++;
      }
      cursor.current = nueva;
    }
    setTexto(nuevo);
    onChange(numero);
  };

  const alCambiar = (e) => procesar(e.target.value, e.target.selectionStart);

  // El punto del teclado numérico escribe coma decimal
  const alTeclear = (e) => {
    if ((e.key === "," || e.key === ".") && decimales === 0) {
      e.preventDefault(); // en campos enteros no hay decimales
      return;
    }
    if (e.key === "." && decimales > 0) {
      e.preventDefault();
      const el = e.target;
      const crudo =
        el.value.slice(0, el.selectionStart) +
        "," +
        el.value.slice(el.selectionEnd);
      procesar(crudo, el.selectionStart + 1);
    }
  };

  const alSalir = () => {
    setEnfocado(false);
    if (completarDecimales) {
      setTexto(aTexto(interpretar(texto, decimales).numero, decimales, true));
    }
  };

  return (
    <input
      {...resto}
      ref={ref}
      type="text"
      inputMode={decimales > 0 ? "decimal" : "numeric"}
      autoComplete="off"
      value={texto}
      onChange={alCambiar}
      onKeyDown={alTeclear}
      onFocus={(e) => {
        setEnfocado(true);
        resto.onFocus?.(e);
      }}
      onBlur={(e) => {
        alSalir();
        resto.onBlur?.(e);
      }}
      className={className}
    />
  );
}
