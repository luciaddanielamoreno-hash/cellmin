import { formatCurrency, formatDateTime } from "../../utils/helpers";

function Dato({ titulo, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
        {titulo}
      </p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

export default function DetalleCompra({ compra, proveedor }) {
  const cancelada = compra.estado === "cancelada";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Dato titulo="Fecha">
          {compra.fecha ? formatDateTime(compra.fecha) : "-"}
        </Dato>
        <Dato titulo="Proveedor">
          {proveedor?.nombre || "-"}
          {proveedor?.telefono && (
            <p className="text-xs text-gray-400">{proveedor.telefono}</p>
          )}
        </Dato>
        <Dato titulo="Remito">{compra.numero_remito || "-"}</Dato>
        <Dato titulo="Estado">
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium ${
              cancelada
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {cancelada ? "Cancelada" : "Completada"}
          </span>
        </Dato>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {["Producto", "Variante", "Cantidad", "Precio unit.", "Subtotal"].map(
                (t) => (
                  <th
                    key={t}
                    className="text-center px-4 py-2 text-xs font-medium text-gray-500"
                  >
                    {t}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {compra.items?.map((item, i) => (
              <tr key={i} className="bg-white">
                <td className="px-4 py-2 text-center font-medium text-gray-700">
                  {item.nombre_producto}
                </td>
                <td className="px-4 py-2 text-center text-gray-500">
                  {item.variante_nombre || "-"}
                </td>
                <td className="px-4 py-2 text-center text-gray-600">
                  {item.cantidad}
                </td>
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

      <div className="flex justify-end">
        <div className="bg-gray-50 rounded-xl p-4 w-full md:w-72">
          <div
            className={`flex justify-between font-bold text-lg ${
              cancelada ? "text-gray-400 line-through" : "text-gray-800"
            }`}
          >
            <span>Total</span>
            <span>{formatCurrency(compra.total)}</span>
          </div>
        </div>
      </div>

      {cancelada && compra.fecha_cancelacion && (
        <p className="text-sm text-red-600">
          Cancelada el {formatDateTime(compra.fecha_cancelacion)}. El stock fue
          revertido.
        </p>
      )}

      {compra.notas && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">
            Notas
          </p>
          <p className="text-sm text-gray-700">{compra.notas}</p>
        </div>
      )}
    </div>
  );
}
