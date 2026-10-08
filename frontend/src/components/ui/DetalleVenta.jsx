import {
  formatCurrency,
  formatDateTime,
  parsearMetodoPago,
  SUCURSALES,
} from "../../utils/helpers";

function Dato({ titulo, valor }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
        {titulo}
      </p>
      <p className="text-sm text-gray-800">{valor}</p>
    </div>
  );
}

export default function DetalleVenta({ venta, cliente }) {
  const pago = parsearMetodoPago(venta.metodo_pago);
  const sucursal =
    SUCURSALES.find((s) => s.value === venta.sucursal)?.label ||
    venta.sucursal ||
    "-";
  const subtotalItems =
    venta.items?.reduce((acc, item) => acc + (item.subtotal || 0), 0) || 0;
  const descuento = venta.descuento || 0;
  const interes = venta.total - (subtotalItems - descuento);
  const completada = venta.estado === "completada";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Dato
          titulo="Fecha"
          valor={venta.fecha ? formatDateTime(venta.fecha) : "-"}
        />
        <Dato
          titulo="Cliente"
          valor={
            cliente
              ? `${cliente.nombre} ${cliente.apellido || ""}`
              : "Consumidor final"
          }
        />
        <Dato titulo="Sucursal" valor={sucursal} />
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">
            Estado
          </p>
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium ${
              completada
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {completada ? "Completada" : "Cancelada"}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">
                Producto
              </th>
              <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">
                Cantidad
              </th>
              <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">
                Precio unit.
              </th>
              <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {venta.items?.map((item, i) => (
              <tr key={i} className="bg-white">
                <td className="px-4 py-2 text-center font-medium text-gray-700">
                  {item.nombre_producto}
                </td>
                <td className="px-4 py-2 text-center text-gray-600">{item.cantidad}</td>
                <td className="px-4 py-2 text-center text-gray-600">
                  {formatCurrency(item.precio_unitario)}
                </td>
                <td className="px-4 py-2 text-center font-medium text-gray-700">
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Método de pago {pago.esMixto && "(mixto)"}
          </p>
          {pago.partes.map((p, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-600">{p.metodo}</span>
              {p.monto && (
                <span className="font-medium text-gray-800">{p.monto}</span>
              )}
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotalItems)}</span>
          </div>
          {descuento > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento</span>
              <span>- {formatCurrency(descuento)}</span>
            </div>
          )}
          {interes > 0.01 && (
            <div className="flex justify-between text-sm text-orange-500">
              <span>Interés</span>
              <span>+ {formatCurrency(interes)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-800 text-lg border-t border-gray-200 pt-2">
            <span>Total</span>
            <span>{formatCurrency(venta.total)}</span>
          </div>
        </div>
      </div>

      {venta.notas && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">
            Notas
          </p>
          <p className="text-sm text-gray-700">{venta.notas}</p>
        </div>
      )}
    </div>
  );
}
