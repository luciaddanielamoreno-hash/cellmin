import { cajaService } from "../services/caja.service";
import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  ExternalLink,
  Printer,
} from "lucide-react";
import { ventasService } from "../services/ventas.service";
import { productosService } from "../services/productos.service";
import { clientesService } from "../services/clientes.service";
import toast from "react-hot-toast";
import {
  formatCurrency,
  formatDateTime,
  METODOS_PAGO,
  parsearMetodoPago,
} from "../utils/helpers";
import { useAuth } from "../context/AuthContext";
import Paginacion from "../components/ui/Paginacion";
import ThOrdenable from "../components/ui/ThOrdenable";
import { useTabla } from "../hooks/useTabla";
import TicketVenta from "../components/ui/TicketVenta";
import DetalleVenta from "../components/ui/DetalleVenta";

function NuevaVentaModal({ onClose, onSave }) {
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [form, setForm] = useState({
    cliente_id: "",
    notas: "",
    sucursal: user?.sucursal || "sucursal_1",
  });
  const [tipoAjuste, setTipoAjuste] = useState("ninguno");
  const [porcentajeAjuste, setPorcentajeAjuste] = useState(0);
  const [pagoMixto, setPagoMixto] = useState(false);
  const [pagos, setPagos] = useState([{ metodo: "efectivo", monto: 0 }]);
  const [loading, setLoading] = useState(false);
  const [montoEditado, setMontoEditado] = useState(false);

  useEffect(() => {
    Promise.all([productosService.getAll(), clientesService.getAll()]).then(
      ([prods, clients]) => {
        setProductos(prods);
        setClientes(clients);
      },
    );
  }, []);

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo_barras?.includes(search),
  );

  const agregarAlCarrito = (producto, variante = null) => {
    const key = variante ? `${producto.id}-${variante.nombre}` : producto.id;
    const stockDisponible = variante
      ? (variante.stock_actual ?? 0)
      : (producto.stock_actual ?? 0);
    const existente = carrito.find((item) => item.key === key);

    if (stockDisponible <= 0) {
      toast.error("Sin stock disponible");
      return;
    }

    if (existente) {
      if (existente.cantidad + 1 > stockDisponible) {
        toast.error(`Solo hay ${stockDisponible} unidades disponibles`);
        return;
      }
      setCarrito(
        carrito.map((item) =>
          item.key === key
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: (item.cantidad + 1) * item.precio_unitario,
              }
            : item,
        ),
      );
    } else {
      const precio = variante ? variante.precio_venta : producto.precio_venta;
      setCarrito([
        ...carrito,
        {
          key,
          producto_id: producto.id,
          variante_nombre: variante?.nombre || null,
          nombre_producto: variante
            ? `${producto.nombre} — ${variante.nombre}`
            : producto.nombre,
          cantidad: 1,
          precio_unitario: precio,
          subtotal: precio,
          stock_disponible: stockDisponible,
        },
      ]);
    }
  };

  const actualizarCantidad = (key, cantidad) => {
    if (cantidad <= 0) {
      setCarrito(carrito.filter((item) => item.key !== key));
      return;
    }
    const item = carrito.find((i) => i.key === key);
    if (item && cantidad > item.stock_disponible) {
      toast.error(`Solo hay ${item.stock_disponible} unidades disponibles`);
      return;
    }
    setCarrito(
      carrito.map((i) =>
        i.key === key
          ? { ...i, cantidad, subtotal: cantidad * i.precio_unitario }
          : i,
      ),
    );
  };

  const subtotal = carrito.reduce((acc, item) => acc + item.subtotal, 0);
  const porcentaje = parseFloat(porcentajeAjuste) || 0;
  const montoAjuste = subtotal * (porcentaje / 100);
  const total =
    tipoAjuste === "descuento"
      ? subtotal - montoAjuste
      : tipoAjuste === "interes"
        ? subtotal + montoAjuste
        : subtotal;

  const totalPagado = pagoMixto
    ? pagos.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0)
    : null;
  const vuelto =
    !pagoMixto && pagos[0]?.metodo === "efectivo"
      ? (parseFloat(pagos[0]?.monto) || 0) - total
      : null;

  useEffect(() => {
    if (!pagoMixto && pagos[0]?.metodo === "efectivo" && !montoEditado) {
      setPagos([{ ...pagos[0], monto: Math.round(total * 100) / 100 }]);
    }
  }, [total, pagoMixto, pagos[0]?.metodo, montoEditado]);

  const handlePagoChange = (index, field, value) => {
    if (!pagoMixto) {
      if (field === "monto") setMontoEditado(true);
      if (field === "metodo") setMontoEditado(false);
    }
    const newPagos = [...pagos];
    newPagos[index] = { ...newPagos[index], [field]: value };
    // Pago mixto con 2 medios: el otro se autocompleta con lo que falta
    if (pagoMixto && field === "monto" && newPagos.length === 2) {
      const otro = index === 0 ? 1 : 0;
      const resto = Math.max(0, total - (parseFloat(value) || 0));
      newPagos[otro] = {
        ...newPagos[otro],
        monto: Math.round(resto * 100) / 100,
      };
    }
    setPagos(newPagos);
  };

  const togglePagoMixto = (value) => {
    setMontoEditado(false);
    setPagoMixto(value);
    setPagos(
      value
        ? [
            { metodo: "efectivo", monto: 0 },
            { metodo: "transferencia", monto: 0 },
          ]
        : [{ metodo: "efectivo", monto: 0 }],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (carrito.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }
    if (pagoMixto && Math.abs(totalPagado - total) > 0.01) {
      toast.error(
        `El total pagado (${formatCurrency(totalPagado)}) no coincide con el total (${formatCurrency(total)})`,
      );
      return;
    }
    setLoading(true);
    try {
      const metodo_pago = pagoMixto
        ? pagos
            .map((p) => `${p.metodo}: ${formatCurrency(p.monto)}`)
            .join(" + ")
        : pagos[0].metodo;
      const data = {
        ...form,
        cliente_id: form.cliente_id || null,
        descuento: tipoAjuste === "descuento" ? montoAjuste : 0,
        total,
        tipo_ajuste: tipoAjuste,
        porcentaje_ajuste: porcentaje,
        pagos: pagos.map((p) => ({
          metodo: p.metodo,
          monto: parseFloat(p.monto) || 0,
        })),
        metodo_pago,
        items: carrito.map((item) => ({
          producto_id: item.producto_id,
          variante_nombre: item.variante_nombre,
          nombre_producto: item.nombre_producto,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        })),
      };
      const result = await ventasService.create(data);
      toast.success(`Venta ${result.numero_venta} registrada`);
      onSave();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Error al registrar la venta",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Nueva Venta</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Productos */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Productos</h3>
            <input
              type="text"
              placeholder="Buscar por nombre o código de barras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {productosFiltrados.map((producto) => (
                <div
                  key={producto.id}
                  className="border border-gray-200 rounded-xl p-3"
                >
                  <p className="font-medium text-gray-800 text-sm">
                    {producto.nombre}
                  </p>
                  {producto.tiene_variantes ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {producto.variantes.map((v) => (
                        <button
                          key={v.nombre}
                          type="button"
                          onClick={() => agregarAlCarrito(producto, v)}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100 transition"
                        >
                          {v.nombre} — {formatCurrency(v.precio_venta)} (stock:{" "}
                          {v.stock_actual ?? 0})
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-500">
                        {formatCurrency(producto.precio_venta)} · stock:{" "}
                        {producto.stock_actual ?? 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => agregarAlCarrito(producto)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition"
                      >
                        Agregar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Carrito y datos */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Carrito</h3>
            {carrito.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                <ShoppingCart
                  size={32}
                  className="mx-auto text-gray-300 mb-2"
                />
                <p className="text-sm text-gray-400">Seleccioná productos</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {carrito.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.nombre_producto}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.precio_unitario)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          actualizarCantidad(item.key, item.cantidad - 1)
                        }
                        className="w-6 h-6 bg-gray-200 rounded-full hover:bg-gray-300 transition flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <span className="text-sm font-medium w-6 text-center">
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          actualizarCantidad(item.key, item.cantidad + 1)
                        }
                        className="w-6 h-6 bg-gray-200 rounded-full hover:bg-gray-300 transition flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-20 text-right">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={form.cliente_id}
                onChange={(e) =>
                  setForm({ ...form, cliente_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin cliente / Consumidor final</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellido}
                  </option>
                ))}
              </select>
            </div>

            {/* Ajuste */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Ajuste de precio
              </p>
              <div className="flex gap-2">
                {["ninguno", "descuento", "interes"].map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => {
                      setTipoAjuste(tipo);
                      setPorcentajeAjuste(0);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                      tipoAjuste === tipo
                        ? tipo === "descuento"
                          ? "bg-green-600 text-white"
                          : tipo === "interes"
                            ? "bg-orange-500 text-white"
                            : "bg-gray-700 text-white"
                        : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {tipo === "ninguno"
                      ? "Ninguno"
                      : tipo === "descuento"
                        ? "Descuento"
                        : "Interés"}
                  </button>
                ))}
              </div>
              {tipoAjuste !== "ninguno" && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={porcentajeAjuste}
                    onChange={(e) => setPorcentajeAjuste(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                  <span className="text-gray-500 font-medium">%</span>
                  <span
                    className={`text-sm font-medium ${tipoAjuste === "descuento" ? "text-green-600" : "text-orange-500"}`}
                  >
                    {tipoAjuste === "descuento" ? "-" : "+"}
                    {formatCurrency(montoAjuste)}
                  </span>
                </div>
              )}
            </div>

            {/* Pago */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Método de pago
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pagoMixto}
                    onChange={(e) => togglePagoMixto(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-xs text-gray-600">Pago mixto</span>
                </label>
              </div>
              {pagos.map((pago, index) => (
                <div key={index} className="grid grid-cols-2 gap-2">
                  <select
                    value={pago.metodo}
                    onChange={(e) =>
                      handlePagoChange(index, "metodo", e.target.value)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {(pagoMixto || pago.metodo === "efectivo") && (
                    <input
                      type="number"
                      min="0"
                      value={pago.monto}
                      onChange={(e) =>
                        handlePagoChange(index, "monto", e.target.value)
                      }
                      placeholder="Monto"
                      className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
              {vuelto !== null && vuelto >= 0 && (
                <div className="flex justify-between text-sm bg-green-50 px-3 py-2 rounded-lg">
                  <span className="text-green-700 font-medium">Vuelto</span>
                  <span className="text-green-700 font-bold">
                    {formatCurrency(vuelto)}
                  </span>
                </div>
              )}
              {pagoMixto &&
                totalPagado !== null &&
                Math.abs(totalPagado - total) > 0.01 && (
                  <div
                    className={`flex justify-between text-sm px-3 py-2 rounded-lg ${totalPagado > total ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"}`}
                  >
                    <span>
                      {totalPagado > total ? "Excede el total" : "Falta pagar"}
                    </span>
                    <span className="font-bold">
                      {formatCurrency(Math.abs(totalPagado - total))}
                    </span>
                  </div>
                )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <input
                type="text"
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Totales */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {tipoAjuste === "descuento" && porcentaje > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento ({porcentaje}%)</span>
                  <span>- {formatCurrency(montoAjuste)}</span>
                </div>
              )}
              {tipoAjuste === "interes" && porcentaje > 0 && (
                <div className="flex justify-between text-sm text-orange-500">
                  <span>Interés ({porcentaje}%)</span>
                  <span>+ {formatCurrency(montoAjuste)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-800 text-lg border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || carrito.length === 0}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition"
            >
              {loading
                ? "Registrando..."
                : `Confirmar Venta — ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BadgePago({ metodoPago }) {
  const { esMixto, partes } = parsearMetodoPago(metodoPago);
  if (esMixto) {
    return (
      <span
        title={partes.map((p) => `${p.metodo}: ${p.monto}`).join(" + ")}
        className="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium cursor-help"
      >
        Mixto
      </span>
    );
  }
  return (
    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
      {partes[0]?.metodo || "-"}
    </span>
  );
}

function FilaVenta({ venta, clientes, onCancel, onImprimir, onVerDetalle }) {
  const [expandido, setExpandido] = useState(false);
  const cliente = clientes.find((c) => c.id === venta.cliente_id);
  const pago = parsearMetodoPago(venta.metodo_pago);

  return (
    <>
      {/* Desktop */}
      <tr className="hidden md:table-row hover:bg-gray-50 transition">
        <td className="px-6 py-4 text-center">
          <button
            onClick={() => onVerDetalle(venta)}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
          >
            {venta.numero_venta}
          </button>
        </td>
        <td className="px-6 py-4 text-sm text-center text-gray-700">
          {venta.fecha ? formatDateTime(venta.fecha) : "-"}
        </td>
        <td className="px-6 py-4 text-sm text-center text-gray-600">
          {cliente
            ? `${cliente.nombre} ${cliente.apellido || ""}`
            : "Consumidor final"}
        </td>
        <td className="px-6 py-4 text-sm text-center text-gray-600">
          {venta.sucursal === "sucursal_1" ? "Sucursal 1" : "Sucursal 2"}
        </td>
        <td className="px-6 py-4 text-sm text-center text-gray-600">
          {venta.items?.length || 0}
        </td>
        <td className="px-6 py-4 text-center">
          <BadgePago metodoPago={venta.metodo_pago} />
        </td>
        <td className="px-6 py-4 text-sm text-center font-semibold text-gray-800">
          {formatCurrency(venta.total)}
        </td>
        <td className="px-6 py-4 text-center">
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium ${
              venta.estado === "completada"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {venta.estado === "completada" ? "Completada" : "Cancelada"}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-2">
            {venta.estado === "completada" && (
              <button
                onClick={() => onCancel(venta._id, venta.numero_venta)}
                className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
              >
                Cancelar
              </button>
            )}
            <a
              href={`/ventas/${venta._id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver detalle en pestaña nueva"
              className="p-1 text-gray-400 hover:text-blue-600"
            >
              <ExternalLink size={16} />
            </a>
            <button
              onClick={() => setExpandido(!expandido)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </td>
      </tr>

      {/* Desktop expandido */}
      {expandido && (
        <tr className="hidden md:table-row">
          <td colSpan={9} className="px-6 pb-4 bg-gray-50">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
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
              <div className="px-4 py-2 bg-gray-50 flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-gray-500">
                  Pago:{" "}
                  <span className="font-medium text-gray-700">
                    {pago.esMixto
                      ? `Mixto (${pago.partes
                          .map((p) => `${p.metodo} ${p.monto}`)
                          .join(" + ")})`
                      : pago.partes[0]?.metodo || "-"}
                  </span>
                </span>
                {venta.descuento > 0 && (
                  <span className="text-gray-500">
                    Descuento:{" "}
                    <span className="font-medium text-red-600">
                      - {formatCurrency(venta.descuento)}
                    </span>
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => onImprimir(venta)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs hover:bg-gray-800 transition"
              >
                <Printer size={14} />
                Imprimir ticket
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Card mobile separada
function CardVentaMobile({
  venta,
  clientes,
  onCancel,
  onImprimir,
  onVerDetalle,
}) {
  const [expandido, setExpandido] = useState(false);
  const cliente = clientes.find((c) => c.id === venta.cliente_id);
  const pago = parsearMetodoPago(venta.metodo_pago);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => onVerDetalle(venta)}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {venta.numero_venta}
          </button>
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium ${
              venta.estado === "completada"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {venta.estado === "completada" ? "Completada" : "Cancelada"}
          </span>
        </div>
        <div className="space-y-1 text-sm text-gray-600">
          <p>
            {cliente
              ? `${cliente.nombre} ${cliente.apellido || ""}`
              : "Consumidor final"}
          </p>
          <p>{venta.fecha ? formatDateTime(venta.fecha) : "-"}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <BadgePago metodoPago={venta.metodo_pago} />
            <span className="text-xs text-gray-400">
              {venta.sucursal === "sucursal_1" ? "Sucursal 1" : "Sucursal 2"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-gray-800">
            {formatCurrency(venta.total)}
          </span>
          <div className="flex items-center gap-2">
            {venta.estado === "completada" && (
              <button
                onClick={() => onCancel(venta._id, venta.numero_venta)}
                className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
              >
                Cancelar
              </button>
            )}
            <a
              href={`/ventas/${venta._id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver detalle en pestaña nueva"
              className="p-1 text-gray-400 hover:text-blue-600"
            >
              <ExternalLink size={16} />
            </a>
            <button
              onClick={() => setExpandido(!expandido)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-2">
          {venta.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-600">
              <span>
                {item.nombre_producto} x{item.cantidad}
              </span>
              <span className="font-medium">
                {formatCurrency(item.subtotal)}
              </span>
            </div>
          ))}
          {venta.descuento > 0 && (
            <div className="flex justify-between text-xs text-red-600 border-t border-gray-200 pt-1">
              <span>Descuento</span>
              <span>- {formatCurrency(venta.descuento)}</span>
            </div>
          )}
          {pago.esMixto && (
            <div className="border-t border-gray-200 pt-1 space-y-0.5">
              {pago.partes.map((p, i) => (
                <div
                  key={i}
                  className="flex justify-between text-xs text-gray-600"
                >
                  <span>{p.metodo}</span>
                  <span className="font-medium">{p.monto}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-800 border-t border-gray-200 pt-1">
            <span>Total</span>
            <span>{formatCurrency(venta.total)}</span>
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={() => onImprimir(venta)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs hover:bg-gray-800 transition"
            >
              <Printer size={14} />
              Imprimir ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalDetalleVenta({ venta, cliente, onClose, onImprimir }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Venta {venta.numero_venta}
          </h2>
          <div className="flex items-center gap-2">
            <a
              href={`/ventas/${venta._id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <ExternalLink size={14} />
              Pestaña nueva
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <DetalleVenta venta={venta} cliente={cliente} />
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition"
          >
            Cerrar
          </button>
          <button
            onClick={() => onImprimir(venta)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl text-sm hover:bg-gray-900 transition"
          >
            <Printer size={16} />
            Imprimir ticket
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalConfirmar({ mensaje, onConfirmar, onCancelar }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4">
        <p className="text-gray-800 font-medium text-center">{mensaje}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ventaImprimir, setVentaImprimir] = useState(null);
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [ventaCancelarId, setVentaCancelarId] = useState(null);
  const [ventaCancelarNumero, setVentaCancelarNumero] = useState(null);

  const [filtros, setFiltros] = useState({
    busqueda: "",
    metodo_pago: "",
    fecha_desde: "",
    fecha_hasta: "",
    producto: "",
    cliente_id: "",
    sucursal: "",
    estado: "",
  });

  const fetchData = async () => {
    try {
      const [vs, cs, ps, cajaActual] = await Promise.all([
        ventasService.getAll(),
        clientesService.getAll(),
        productosService.getAll(),
        cajaService.getActual(),
      ]);
      setVentas(vs);
      setClientes(cs);
      setProductos(ps);
      setCajaAbierta(cajaActual?.estado === "abierta");
    } catch (error) {
      toast.error("Error al cargar ventas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
  }, [filtros]);

  const handleCancel = async () => {
    try {
      await ventasService.cancel(ventaCancelarId);
      toast.success("Venta cancelada y stock restaurado");
      setShowConfirmar(false);
      setVentaCancelarId(null);
      setVentaCancelarNumero(null);
      fetchData();
    } catch (error) {
      toast.error("Error al cancelar la venta");
    }
  };

  const limpiarFiltros = () =>
    setFiltros({
      busqueda: "",
      metodo_pago: "",
      fecha_desde: "",
      fecha_hasta: "",
      producto: "",
      cliente_id: "",
      sucursal: "",
      estado: "",
    });

  const filtrosActivos = Object.values(filtros).some((v) => v !== "");

  const filtered = ventas.filter((venta) => {
    if (
      filtros.busqueda &&
      !venta.numero_venta
        ?.toLowerCase()
        .includes(filtros.busqueda.toLowerCase())
    )
      return false;
    if (
      filtros.metodo_pago &&
      !venta.metodo_pago?.includes(filtros.metodo_pago)
    )
      return false;
    if (filtros.cliente_id && venta.cliente_id !== filtros.cliente_id)
      return false;
    if (filtros.fecha_desde) {
      const desde = new Date(filtros.fecha_desde);
      const fechaVenta = new Date(venta.fecha);
      if (fechaVenta < desde) return false;
    }
    if (filtros.fecha_hasta) {
      const hasta = new Date(filtros.fecha_hasta);
      hasta.setHours(23, 59, 59);
      const fechaVenta = new Date(venta.fecha);
      if (fechaVenta > hasta) return false;
    }
    if (filtros.producto) {
      const tieneProducto = venta.items?.some((item) =>
        item.nombre_producto
          ?.toLowerCase()
          .includes(filtros.producto.toLowerCase()),
      );
      if (!tieneProducto) return false;
    }
    if (filtros.estado && venta.estado !== filtros.estado) return false;
    if (filtros.sucursal && venta.sucursal !== filtros.sucursal) return false;
    return true;
  });

  const totalFiltrado = filtered
    .filter((v) => v.estado === "completada")
    .reduce((acc, v) => acc + v.total, 0);

  const nombreCliente = (v) => {
    const c = clientes.find((x) => x.id === v.cliente_id);
    return c ? `${c.nombre} ${c.apellido || ""}`.trim() : "Consumidor final";
  };

  const tabla = useTabla(filtered, {
    porPagina: 20,
    ordenInicial: { campo: "fecha", dir: "desc" },
    accessors: {
      fecha: (v) => (v.fecha ? new Date(v.fecha).getTime() : null),
      cliente: nombreCliente,
      productos: (v) => v.items?.length || 0,
      pago: (v) => v.metodo_pago,
    },
  });
  const ventasPaginadas = tabla.filas;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ventas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {ventas.length} ventas registradas
          </p>
        </div>
        <button
          onClick={() => {
            if (!cajaAbierta) {
              toast.error("Debe haber una caja abierta para registrar ventas");
              return;
            }
            setShowModal(true);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-90 transition text-sm font-medium text-white ${
            cajaAbierta
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          <Plus size={18} />
          Nueva Venta
          {!cajaAbierta && (
            <span className="text-xs opacity-75">(caja cerrada)</span>
          )}
        </button>
      </div>

      {/* Buscador y filtros */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por número de venta..."
              value={filtros.busqueda}
              onChange={(e) =>
                setFiltros({ ...filtros, busqueda: e.target.value })
              }
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFiltros(!showFiltros)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${
              filtrosActivos
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Filter size={16} />
            Filtros{" "}
            {filtrosActivos &&
              `(${Object.values(filtros).filter((v) => v !== "").length})`}
          </button>
          {filtrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="px-4 py-2 rounded-xl text-sm text-red-600 border border-red-200 hover:bg-red-50 transition"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Panel de filtros */}
        {showFiltros && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Método de pago
              </label>
              <select
                value={filtros.metodo_pago}
                onChange={(e) =>
                  setFiltros({ ...filtros, metodo_pago: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {METODOS_PAGO.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Cliente
              </label>
              <select
                value={filtros.cliente_id}
                onChange={(e) =>
                  setFiltros({ ...filtros, cliente_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellido || ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Producto
              </label>
              <input
                type="text"
                placeholder="Nombre del producto..."
                value={filtros.producto}
                onChange={(e) =>
                  setFiltros({ ...filtros, producto: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fecha desde
              </label>
              <input
                type="date"
                value={filtros.fecha_desde}
                onChange={(e) =>
                  setFiltros({ ...filtros, fecha_desde: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fecha hasta
              </label>
              <input
                type="date"
                value={filtros.fecha_hasta}
                onChange={(e) =>
                  setFiltros({ ...filtros, fecha_hasta: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Sucursal
              </label>
              <select
                value={filtros.sucursal}
                onChange={(e) =>
                  setFiltros({ ...filtros, sucursal: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                <option value="sucursal_1">Sucursal 1</option>
                <option value="sucursal_2">Sucursal 2</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Estado
              </label>
              <select
                value={filtros.estado}
                onChange={(e) =>
                  setFiltros({ ...filtros, estado: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="completada">Completadas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Resumen filtrado */}
      {filtrosActivos && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {filtered.length} ventas encontradas
          </span>
          <span className="text-sm font-bold text-blue-800">
            Total: {formatCurrency(totalFiltrado)}
          </span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No se encontraron ventas</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <ThOrdenable campo="numero_venta" tabla={tabla} align="center">
                    Número
                  </ThOrdenable>
                  <ThOrdenable campo="fecha" tabla={tabla} align="center">
                    Fecha
                  </ThOrdenable>
                  <ThOrdenable campo="cliente" tabla={tabla} align="center">
                    Cliente
                  </ThOrdenable>
                  <ThOrdenable campo="sucursal" tabla={tabla} align="center">
                    Sucursal
                  </ThOrdenable>
                  <ThOrdenable campo="productos" tabla={tabla} align="center">
                    Productos
                  </ThOrdenable>
                  <ThOrdenable campo="pago" tabla={tabla} align="center">
                    Medio de pago
                  </ThOrdenable>
                  <ThOrdenable campo="total" tabla={tabla} align="center">
                    Total
                  </ThOrdenable>
                  <ThOrdenable campo="estado" tabla={tabla} align="center">
                    Estado
                  </ThOrdenable>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ventasPaginadas.map((venta) => (
                  <FilaVenta
                    key={venta._id}
                    venta={venta}
                    clientes={clientes}
                    onVerDetalle={setVentaDetalle}
                    onCancel={(id, numero) => {
                      setVentaCancelarId(id);
                      setVentaCancelarNumero(numero);
                      setShowConfirmar(true);
                    }}
                    onImprimir={(v) => {
                      setVentaImprimir(v);
                      setShowTicket(true);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {ventasPaginadas.map((venta) => (
              <CardVentaMobile
                key={venta._id}
                venta={venta}
                clientes={clientes}
                onVerDetalle={setVentaDetalle}
                onCancel={(id, numero) => {
                  setVentaCancelarId(id);
                  setVentaCancelarNumero(numero);
                  setShowConfirmar(true);
                }}
                onImprimir={(v) => {
                  setVentaImprimir(v);
                  setShowTicket(true);
                }}
              />
            ))}
          </div>

          <Paginacion
            total={tabla.total}
            porPagina={tabla.porPagina}
            paginaActual={tabla.pagina}
            onChange={tabla.setPagina}
          />
        </>
      )}

      {showModal && (
        <NuevaVentaModal
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchData();
          }}
        />
      )}

      {ventaDetalle && (
        <ModalDetalleVenta
          venta={ventaDetalle}
          cliente={clientes.find((c) => c.id === ventaDetalle.cliente_id)}
          onClose={() => setVentaDetalle(null)}
          onImprimir={(v) => {
            setVentaImprimir(v);
            setShowTicket(true);
          }}
        />
      )}

      {showTicket && ventaImprimir && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Ticket de Venta
              </h2>
              <button
                onClick={() => {
                  setShowTicket(false);
                  setVentaImprimir(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <TicketVenta
              venta={ventaImprimir}
              cliente={clientes.find((c) => c.id === ventaImprimir.cliente_id)}
            />
            <button
              onClick={() => {
                setShowTicket(false);
                setVentaImprimir(null);
              }}
              className="mt-3 w-full py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showConfirmar && (
        <ModalConfirmar
          mensaje={`¿Cancelar la venta ${ventaCancelarNumero}? El stock será restaurado.`}
          onConfirmar={handleCancel}
          onCancelar={() => {
            setShowConfirmar(false);
            setVentaCancelarId(null);
            setVentaCancelarNumero(null);
          }}
        />
      )}
    </div>
  );
}
