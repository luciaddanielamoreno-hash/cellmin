import { Printer } from "lucide-react";
import { formatCurrency, formatDateTime, describirPago } from "../../utils/helpers";

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

export default function TicketVenta({ venta, cliente }) {
  const sucursal = SUCURSALES[venta.sucursal] || SUCURSALES.sucursal_1;

  const handlePrint = () => {
    const contenido = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ticket Venta ${venta.numero_venta}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: monospace; font-size: 12px; width: 80mm; padding: 8px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .big { font-size: 16px; }
        .medium { font-size: 13px; }
        .small { font-size: 11px; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        .section { margin-bottom: 6px; }
        @page { size: 80mm auto; margin: 0; }
        body { width: 80mm; }
      </style>
    </head>
    <body>
      <div class="section center">
        <p class="bold big">CELLMIN</p>
        <p class="small">${sucursal.nombre}</p>
        <p class="small">${sucursal.direccion}</p>
        <p class="small">${sucursal.barrio}</p>
      </div>
      <div class="divider"></div>
      <div class="section">
        <p class="bold">Venta: ${venta.numero_venta}</p>
        <p>Fecha: ${formatDateTime(venta.fecha)}</p>
        ${cliente ? `<p>Cliente: ${cliente.nombre} ${cliente.apellido || ""}</p>` : ""}
      </div>
      <div class="divider"></div>
      <div class="section">
        ${venta.items
          ?.map(
            (item) => `
          <p class="bold">${item.nombre_producto}</p>
          <div class="row">
            <span>${item.cantidad} x ${formatCurrency(item.precio_unitario)}</span>
            <span>${formatCurrency(item.subtotal)}</span>
          </div>
        `,
          )
          .join("")}
      </div>
      <div class="divider"></div>
      <div class="section">
        ${
          venta.descuento > 0
            ? `
          <div class="row">
            <span>Descuento:</span>
            <span>- ${formatCurrency(venta.descuento)}</span>
          </div>
        `
            : ""
        }
        <div class="row bold medium">
          <span>TOTAL:</span>
          <span>${formatCurrency(venta.total)}</span>
        </div>
        <div class="row">
          <span>Método de pago:</span>
          <span>${describirPago(venta).texto}</span>
        </div>
        ${
          describirPago(venta).vuelto > 0
            ? `<div class="row"><span>Vuelto (en pesos):</span><span>${formatCurrency(describirPago(venta).vuelto)}</span></div>`
            : ""
        }
      </div>
      <div class="divider"></div>
      <div class="section center small">
        <p>¡Gracias por su compra!</p>
        <p>Conserve este comprobante</p>
      </div>
    </body>
    </html>
  `;
    const ventana = window.open("", "_blank", "width=400,height=700");
    ventana.document.write(contenido);
    ventana.document.close();
    setTimeout(() => {
      ventana.focus();
      ventana.print();
    }, 800);
  };
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 text-center space-y-1">
        <p className="font-bold text-gray-800">{sucursal.nombre}</p>
        <p className="text-sm text-gray-600">{sucursal.direccion}</p>
        <p className="text-sm font-bold text-gray-800 mt-2">
          Venta: {venta.numero_venta}
        </p>
        <p className="text-sm text-gray-600">{formatDateTime(venta.fecha)}</p>
        {cliente && (
          <p className="text-sm text-gray-600">
            {cliente.nombre} {cliente.apellido || ""}
          </p>
        )}
      </div>

      <div className="space-y-1">
        {venta.items?.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.nombre_producto} x{item.cantidad}
            </span>
            <span className="font-medium">{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
        {venta.descuento > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Descuento</span>
            <span>- {formatCurrency(venta.descuento)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-2 mt-2">
          <span>Total</span>
          <span>{formatCurrency(venta.total)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Método de pago</span>
          <span>{describirPago(venta).texto}</span>
        </div>
        {describirPago(venta).vuelto > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Vuelto (en pesos)</span>
            <span>{formatCurrency(describirPago(venta).vuelto)}</span>
          </div>
        )}
      </div>

      <button
        onClick={handlePrint}
        className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm hover:bg-gray-900 transition flex items-center justify-center gap-2"
      >
        <Printer size={16} /> Imprimir ticket
      </button>
    </div>
  );
}
