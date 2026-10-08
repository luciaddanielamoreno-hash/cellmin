import { useState, useEffect } from "react";
import {
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Package,
  Plus,
  RefreshCw,
} from "lucide-react";
import { stockService } from "../services/stock.service";
import { productosService } from "../services/productos.service";
import toast from "react-hot-toast";
import { formatCurrency, formatDateTime } from "../utils/helpers";
import Paginacion from "../components/ui/Paginacion";
import { useAuth } from "../context/AuthContext";

function MovimientoModal({ onClose, onSave }) {
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({
    producto_id: "",
    variante_nombre: "",
    tipo: "entrada",
    cantidad: 1,
    motivo: "ajuste_manual",
    notas: "",
  });
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    productosService.getAll().then(setProductos);
  }, []);

  const handleProductoChange = (id) => {
    const p = productos.find((p) => p.id === id);
    setProductoSeleccionado(p);
    setForm({ ...form, producto_id: id, variante_nombre: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await stockService.crearMovimiento({
        ...form,
        cantidad: parseInt(form.cantidad),
        variante_nombre: form.variante_nombre || null,
      });
      toast.success("Movimiento registrado");
      onSave();
    } catch (error) {
      toast.error("Error al registrar movimiento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Nuevo Movimiento de Stock
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producto *
            </label>
            <select
              required
              value={form.producto_id}
              onChange={(e) => handleProductoChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar producto</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {productoSeleccionado?.tiene_variantes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variante *
              </label>
              <select
                required
                value={form.variante_nombre}
                onChange={(e) =>
                  setForm({ ...form, variante_nombre: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar variante</option>
                {productoSeleccionado.variantes.map((v) => (
                  <option key={v.nombre} value={v.nombre}>
                    {v.nombre} (Stock: {v.stock_actual})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="entrada">Entrada (suma al stock)</option>
                <option value="salida">Salida (resta al stock)</option>
                <option value="ajuste">Ajuste (establece el stock)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad *
              </label>
              <input
                type="number"
                required
                min="1"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo *
            </label>
            <select
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ajuste_manual">Ajuste manual</option>
              <option value="devolucion">Devolución</option>
              <option value="perdida">Pérdida / Rotura</option>
              <option value="inventario">Inventario</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:bg-blue-400 transition"
            >
              {loading ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Stock() {
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("inventario");
  const [showModal, setShowModal] = useState(false);
  const [paginaMovimientos, setPaginaMovimientos] = useState(1);
  const [paginaActual, setPaginaActual] = useState(1);
  const POR_PAGINA = 20;
  const { user } = useAuth();
  const [filtrosMovimientos, setFiltrosMovimientos] = useState({
    busqueda: "",
    tipo: "",
    motivo: "",
    fecha_desde: "",
    fecha_hasta: "",
  });

  const fetchData = async () => {
    try {
      const [prods, movs] = await Promise.all([
        stockService.getProductos(),
        stockService.getMovimientos(),
      ]);
      setProductos(prods);
      setMovimientos(movs);
    } catch (error) {
      toast.error("Error al cargar stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProductos = productos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  const alertas = productos.filter((p) => p.alerta);

  const productosPaginados = filteredProductos.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA,
  );
  const movimientosFiltrados = movimientos.filter((m) => {
    const producto = productos.find((p) => p.id === m.producto_id);
    if (
      filtrosMovimientos.busqueda &&
      !producto?.nombre
        .toLowerCase()
        .includes(filtrosMovimientos.busqueda.toLowerCase()) &&
      !m.variante_nombre
        ?.toLowerCase()
        .includes(filtrosMovimientos.busqueda.toLowerCase())
    )
      return false;
    if (filtrosMovimientos.tipo && m.tipo !== filtrosMovimientos.tipo)
      return false;
    if (filtrosMovimientos.motivo && m.motivo !== filtrosMovimientos.motivo)
      return false;
    if (filtrosMovimientos.fecha_desde) {
      const desde = new Date(filtrosMovimientos.fecha_desde);
      if (new Date(m.fecha) < desde) return false;
    }
    if (filtrosMovimientos.fecha_hasta) {
      const hasta = new Date(filtrosMovimientos.fecha_hasta);
      hasta.setHours(23, 59, 59);
      if (new Date(m.fecha) > hasta) return false;
    }
    return true;
  });

  const movimientosPaginados = movimientosFiltrados.slice(
    (paginaMovimientos - 1) * POR_PAGINA,
    paginaMovimientos * POR_PAGINA,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Stock</h1>
          <p className="text-gray-500 text-sm mt-1">
            {productos.length} productos en inventario
          </p>
        </div>
        {user?.rol !== "cajero" && user?.rol !== "vendedor" && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
          >
            <Plus size={18} />
            Nuevo Movimiento
          </button>
        )}
      </div>

      {/* Alerta stock bajo */}
      {alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">{alertas.length} producto(s)</span>{" "}
            con stock bajo o agotado
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("inventario")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "inventario"
              ? "bg-white shadow text-gray-800"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Inventario
        </button>
        {user?.rol !== "cajero" && user?.rol !== "vendedor" && (
          <button
            onClick={() => setTab("movimientos")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === "movimientos"
                ? "bg-white shadow text-gray-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Movimientos
          </button>
        )}
      </div>

      {tab === "inventario" && (
        <>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Cargando...</div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Producto
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Variante
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Stock Actual
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Stock Mínimo
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProductos.map((producto) =>
                      producto.tiene_variantes ? (
                        producto.variantes.map((v, i) => (
                          <tr
                            key={`${producto.id}-${i}`}
                            className={`hover:bg-gray-50 transition ${i === 0 ? "border-t-2 border-gray-200" : ""}`}
                          >
                            {i === 0 && (
                              <td
                                className="px-6 py-4 font-medium text-gray-800"
                                rowSpan={producto.variantes.length}
                              >
                                <div className="flex items-center gap-2">
                                  <Package
                                    size={16}
                                    className="text-gray-400"
                                  />
                                  {producto.nombre}
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {v.nombre}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-800">
                              {v.stock_actual}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {v.stock_minimo}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                                  v.stock_actual < v.stock_minimo
                                    ? "bg-red-100 text-red-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {v.stock_actual < v.stock_minimo ? (
                                  <>
                                    <AlertTriangle size={10} /> Stock bajo
                                  </>
                                ) : (
                                  "OK"
                                )}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr
                          key={producto.id}
                          className="hover:bg-gray-50 transition border-t-2 border-gray-200"
                        >
                          <td className="px-6 py-4 font-medium text-gray-800">
                            <div className="flex items-center gap-2">
                              <Package size={16} className="text-gray-400" />
                              {producto.nombre}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">-</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">
                            {producto.stock_actual}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {producto.stock_minimo}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                                producto.stock_actual < producto.stock_minimo
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {producto.stock_actual < producto.stock_minimo ? (
                                <>
                                  <AlertTriangle size={10} /> Stock bajo
                                </>
                              ) : (
                                "OK"
                              )}
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
                <Paginacion
                  total={filteredProductos.length}
                  porPagina={POR_PAGINA}
                  paginaActual={paginaActual}
                  onChange={setPaginaActual}
                />
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {filteredProductos.map((producto) => (
                  <div
                    key={producto.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Package size={16} className="text-gray-400 shrink-0" />
                        <p className="font-medium text-gray-800">
                          {producto.nombre}
                        </p>
                      </div>
                      {producto.tiene_variantes ? (
                        <div className="space-y-2">
                          {producto.variantes.map((v, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-700">
                                  {v.nombre}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Mínimo: {v.stock_minimo}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-800">
                                  {v.stock_actual}
                                </p>
                                <span
                                  className={`text-xs font-medium ${
                                    v.stock_actual < v.stock_minimo
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {v.stock_actual < v.stock_minimo
                                    ? "⚠ Stock bajo"
                                    : "✓ OK"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                          <div>
                            <p className="text-xs text-gray-500">
                              Stock actual
                            </p>
                            <p className="text-lg font-bold text-gray-800">
                              {producto.stock_actual}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              Mínimo: {producto.stock_minimo}
                            </p>
                            <span
                              className={`text-xs font-medium ${
                                producto.stock_actual < producto.stock_minimo
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {producto.stock_actual < producto.stock_minimo
                                ? "⚠ Stock bajo"
                                : "✓ OK"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <Paginacion
                  total={filteredProductos.length}
                  porPagina={POR_PAGINA}
                  paginaActual={paginaActual}
                  onChange={setPaginaActual}
                />
              </div>
            </>
          )}
        </>
      )}
      {tab === "movimientos" && (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Buscar por producto..."
                value={filtrosMovimientos.busqueda}
                onChange={(e) =>
                  setFiltrosMovimientos({
                    ...filtrosMovimientos,
                    busqueda: e.target.value,
                  })
                }
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filtrosMovimientos.tipo}
              onChange={(e) =>
                setFiltrosMovimientos({
                  ...filtrosMovimientos,
                  tipo: e.target.value,
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
            <select
              value={filtrosMovimientos.motivo}
              onChange={(e) =>
                setFiltrosMovimientos({
                  ...filtrosMovimientos,
                  motivo: e.target.value,
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los motivos</option>
              <option value="ajuste_manual">Ajuste manual</option>
              <option value="devolucion">Devolución</option>
              <option value="perdida">Pérdida / Rotura</option>
              <option value="inventario">Inventario</option>
              <option value="compra">Compra</option>
              <option value="venta">Venta</option>
            </select>
            <input
              type="date"
              value={filtrosMovimientos.fecha_desde}
              onChange={(e) =>
                setFiltrosMovimientos({
                  ...filtrosMovimientos,
                  fecha_desde: e.target.value,
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filtrosMovimientos.fecha_hasta}
              onChange={(e) =>
                setFiltrosMovimientos({
                  ...filtrosMovimientos,
                  fecha_hasta: e.target.value,
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Cantidad
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Motivo
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movimientosPaginados.map((m, i) => {
                  const producto = productos.find(
                    (p) => p.id === m.producto_id,
                  );
                  const motivoLabel =
                    {
                      ajuste_manual: "Ajuste manual",
                      devolucion: "Devolución",
                      perdida: "Pérdida / Rotura",
                      inventario: "Inventario",
                      compra: "Compra",
                      venta: "Venta",
                      cancelacion_compra: "Cancelación de compra",
                    }[m.motivo] || m.motivo;
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                            m.tipo === "entrada"
                              ? "bg-green-100 text-green-700"
                              : m.tipo === "salida"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {m.tipo === "entrada" ? (
                            <ArrowUpCircle size={12} />
                          ) : m.tipo === "salida" ? (
                            <ArrowDownCircle size={12} />
                          ) : (
                            <RefreshCw size={12} />
                          )}
                          {m.tipo === "entrada"
                            ? "Entrada"
                            : m.tipo === "salida"
                              ? "Salida"
                              : "Ajuste"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span className="font-medium">
                          {producto?.nombre || "Producto eliminado"}
                        </span>
                        {m.variante_nombre && (
                          <span className="text-gray-400">
                            {" "}
                            — {m.variante_nombre}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {m.cantidad}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {motivoLabel}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {m.fecha ? formatDateTime(m.fecha) : "-"}
                      </td>
                    </tr>
                  );
                })}
                {movimientos.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-400"
                    >
                      No hay movimientos registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {movimientos.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No hay movimientos registrados
              </div>
            ) : (
              movimientosPaginados.map((m, i) => {
                const producto = productos.find((p) => p.id === m.producto_id);
                const motivoLabel =
                  {
                    ajuste_manual: "Ajuste manual",
                    devolucion: "Devolución",
                    perdida: "Pérdida / Rotura",
                    inventario: "Inventario",
                    compra: "Compra",
                    venta: "Venta",
                    cancelacion_compra: "Cancelación de compra",
                  }[m.motivo] || m.motivo;
                return (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                          m.tipo === "entrada"
                            ? "bg-green-100 text-green-700"
                            : m.tipo === "salida"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {m.tipo === "entrada" ? (
                          <ArrowUpCircle size={12} />
                        ) : m.tipo === "salida" ? (
                          <ArrowDownCircle size={12} />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                        {m.tipo === "entrada"
                          ? "Entrada"
                          : m.tipo === "salida"
                            ? "Salida"
                            : "Ajuste"}
                      </span>
                      <span className="text-sm font-bold text-gray-800">
                        x{m.cantidad}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {producto?.nombre || "Producto eliminado"}
                      {m.variante_nombre && (
                        <span className="text-gray-400 font-normal">
                          {" "}
                          — {m.variante_nombre}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{motivoLabel}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {m.fecha ? formatDateTime(m.fecha) : "-"}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <Paginacion
            total={movimientosFiltrados.length}
            porPagina={POR_PAGINA}
            paginaActual={paginaMovimientos}
            onChange={setPaginaMovimientos}
          />
        </>
      )}

      {showModal && (
        <MovimientoModal
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
