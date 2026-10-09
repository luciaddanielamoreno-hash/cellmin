import { Printer } from "lucide-react";
import { formatCurrency, formatDateTime } from "../../utils/helpers";

const SUCURSALES = {
  sucursal_1: {
    nombre: "Cellmin — General Paz",
    direccion: "25 de Mayo 1337",
    barrio: "General Paz",
  },
  sucursal_2: {
    nombre: "Cellmin — Yofre Norte",
    direccion: "Alsina 2202",
    barrio: "Yofre Norte",
  },
};

const escapar = (t) =>
  String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Bloqueo de pantalla: solo para la copia del técnico
function htmlBloqueo(equipo) {
  const tipo = equipo?.bloqueo_tipo;
  const valor = equipo?.bloqueo_valor;
  if (!tipo || tipo === "ninguno" || !valor) return "";

  let detalle = "";
  if (tipo === "pin") detalle = `<p>PIN: <b>${escapar(valor)}</b></p>`;
  if (tipo === "password") detalle = `<p>Contraseña: <b>${escapar(valor)}</b></p>`;
  if (tipo === "patron") {
    const orden = valor.split("-").map(Number);
    const celdas = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      .map((n) => {
        const pos = orden.indexOf(n) + 1;
        return `<td style="width:26px;height:26px;border:1px solid #000;text-align:center;font-weight:bold;">${pos > 0 ? pos : "·"}</td>`;
      })
      .reduce(
        (filas, td, i) => {
          if (i % 3 === 0) filas.push([]);
          filas[filas.length - 1].push(td);
          return filas;
        },
        [],
      )
      .map((fila) => `<tr>${fila.join("")}</tr>`)
      .join("");
    detalle = `<p>Patrón (orden de los puntos):</p>
      <table style="border-collapse:collapse; margin:4px 0;">${celdas}</table>`;
  }

  return `
    <div style="border-top:1px dashed #000; margin:6px 0;"></div>
    <div style="margin-bottom:6px;">
      <p style="font-weight:bold;">BLOQUEO DE PANTALLA</p>
      ${detalle}
    </div>`;
}

function generarHTML(reparacion, cliente, tipo) {
  const sucursal = SUCURSALES[reparacion.sucursal] || SUCURSALES.sucursal_1;
  const esTecnico = tipo === "tecnico";

  return `
    <div style="width:80mm; font-family:monospace; font-size:12px; padding:8px; page-break-after:always;">
      <div style="text-align:center; margin-bottom:8px;">
        <p style="font-weight:bold; font-size:16px;">CELLMIN</p>
        <p style="font-size:11px;">${sucursal.nombre}</p>
        <p style="font-size:11px;">${sucursal.direccion}</p>
        <p style="font-weight:bold; font-size:13px; margin-top:4px;">ORDEN DE REPARACIÓN</p>
        <p style="font-size:11px;">${esTecnico ? "— COPIA TÉCNICO —" : "— COPIA CLIENTE —"}</p>
      </div>

      <div style="border-top:1px dashed #000; margin:6px 0;"></div>

      <div style="margin-bottom:6px;">
        <p style="font-weight:bold;">Orden: ${reparacion.numero_orden}</p>
        <p>Ingreso: ${formatDateTime(reparacion.fecha_ingreso)}</p>
      </div>

      <div style="border-top:1px dashed #000; margin:6px 0;"></div>

      <div style="margin-bottom:6px;">
        <p style="font-weight:bold;">CLIENTE</p>
        <p>${cliente?.nombre || ""} ${cliente?.apellido || ""}</p>
        ${cliente?.telefono ? `<p>Tel: ${cliente.telefono}</p>` : ""}
        ${cliente?.dni ? `<p>DNI: ${cliente.dni}</p>` : ""}
      </div>

      <div style="border-top:1px dashed #000; margin:6px 0;"></div>

      <div style="margin-bottom:6px;">
        <p style="font-weight:bold;">EQUIPO</p>
        <p>Marca: ${reparacion.equipo?.marca || ""}</p>
        <p>Modelo: ${reparacion.equipo?.modelo || ""}</p>
        ${reparacion.equipo?.imei ? `<p>IMEI: ${reparacion.equipo.imei}</p>` : ""}
        ${reparacion.equipo?.problema_descripcion ? `<p>Problema: ${reparacion.equipo.problema_descripcion}</p>` : ""}
      </div>

      ${esTecnico ? htmlBloqueo(reparacion.equipo) : ""}

      ${
        reparacion.tipos_reparacion?.length > 0
          ? `
        <div style="border-top:1px dashed #000; margin:6px 0;"></div>
        <div style="margin-bottom:6px;">
          <p style="font-weight:bold;">REPARACIONES</p>
          ${reparacion.tipos_reparacion
            .map(
              (t) => `
            <div style="display:flex; justify-content:space-between;">
              <span>${t.nombre}</span>
              <span>${formatCurrency(t.precio)}</span>
            </div>
          `,
            )
            .join("")}
          <div style="display:flex; justify-content:space-between; font-weight:bold; margin-top:4px;">
            <span>TOTAL:</span>
            <span>${formatCurrency(reparacion.precio_total)}</span>
          </div>
          ${
            reparacion.total_pagado > 0
              ? `
          <div style="display:flex; justify-content:space-between;">
            <span>PAGADO:</span>
            <span>${formatCurrency(reparacion.total_pagado)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-weight:bold;">
            <span>SALDO:</span>
            <span>${formatCurrency(reparacion.saldo_pendiente)}</span>
          </div>`
              : ""
          }
        </div>
      `
          : ""
      }

      ${
        reparacion.garantia_dias > 0
          ? `
        <div style="border-top:1px dashed #000; margin:6px 0;"></div>
        <div style="margin-bottom:6px;">
          <p>Garantía: ${reparacion.garantia_dias} días</p>
        </div>
      `
          : ""
      }

      ${
        esTecnico && reparacion.notas_internas
          ? `
        <div style="border-top:1px dashed #000; margin:6px 0;"></div>
        <div style="margin-bottom:6px;">
          <p style="font-weight:bold;">NOTAS INTERNAS</p>
          <p>${reparacion.notas_internas}</p>
        </div>
      `
          : ""
      }

      ${
        esTecnico
          ? `
        <div style="border-top:1px dashed #000; margin:6px 0;"></div>
        <div style="margin-bottom:6px;">
          <p style="font-weight:bold;">ENTREGA DEL EQUIPO</p>
          <p style="margin-top:30px;">Firma cliente: ___________________</p>
          <p style="margin-top:10px;">Aclaración: ___________________</p>
          <p style="margin-top:10px;">Fecha entrega: ___________________</p>
        </div>
      `
          : ""
      }

      <div style="border-top:1px dashed #000; margin:6px 0;"></div>
      ${
        esTecnico
          ? ""
          : `<div style="text-align:center; font-size:11px;">
        <p>Presente este comprobante al retirar su equipo</p>
      </div>`
      }
    </div>
  `;
}

export function imprimirOrden(reparacion, cliente) {
    const contenidoHTML = `
    ${generarHTML(reparacion, cliente, "cliente")}
    ${generarHTML(reparacion, cliente, "tecnico")}
  `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { width: 80mm; }
        @media print { @page { margin: 0; size: 80mm auto; } }
      </style>
    </head>
    <body>${contenidoHTML}</body>
    </html>
  `);
    doc.close();

    const tituloOriginal = document.title;
    document.title = `Orden_${reparacion.numero_orden}`;

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        document.title = tituloOriginal;
      }, 1000);
    }, 500);
  }

export default function OrdenReparacion({ reparacion, cliente }) {
  const handlePrint = () => imprimirOrden(reparacion, cliente);

  const sucursal = SUCURSALES[reparacion.sucursal] || SUCURSALES.sucursal_1;

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <p className="font-bold text-gray-800 text-center">{sucursal.nombre}</p>
        <p className="text-sm text-gray-600 text-center">
          {sucursal.direccion}
        </p>
        <div className="border-t border-gray-200 pt-2 space-y-1">
          <p className="text-sm font-bold text-gray-800">
            Orden: {reparacion.numero_orden}
          </p>
          <p className="text-sm text-gray-600">
            {cliente?.nombre} {cliente?.apellido || ""}
          </p>
          <p className="text-sm text-gray-600">
            {reparacion.equipo?.marca} {reparacion.equipo?.modelo}
          </p>
          {reparacion.tipos_reparacion?.length > 0 && (
            <p className="text-sm font-bold text-gray-800">
              Total: {formatCurrency(reparacion.precio_total)}
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Se imprimirán 2 copias: cliente y técnico
      </p>

      <button
        onClick={handlePrint}
        className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm hover:bg-gray-900 transition inline-flex items-center justify-center gap-2"
      >
        <Printer size={15} />
        Imprimir orden (2 copias)
      </button>
    </div>
  );
}
