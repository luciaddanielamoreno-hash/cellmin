import { useState, useEffect } from "react";
import {
  BarChart2,
  TrendingUp,
  Package,
  Wrench,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { reportesService } from "../services/reportes.service";
import { formatCurrency } from "../utils/helpers";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import toast from "react-hot-toast";

const COLORES = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

const PERIODOS = [
  { value: "dia", label: "Hoy" },
  { value: "semana", label: "Última semana" },
  { value: "mes", label: "Este mes" },
  { value: "año", label: "Este año" },
];

const ESTADOS_REP = {
  en_diagnostico: "En diagnóstico",
  ingresada: "Ingresada",
  en_reparacion: "En reparación",
  lista: "Lista",
  entregada: "Entregada",
};

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div
        className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4`}
      >
        <Icon size={22} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function Reportes() {
  const [periodo, setPeriodo] = useState("mes");
  const [tab, setTab] = useState("ventas");
  const [ventasData, setVentasData] = useState(null);
  const [productosData, setProductosData] = useState([]);
  const [rentabilidadData, setRentabilidadData] = useState(null);
  const [reparacionesData, setReparacionesData] = useState(null);
  const [stockBajoData, setStockBajoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [usandoFechaPersonalizada, setUsandoFechaPersonalizada] =
    useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const desde = usandoFechaPersonalizada ? fechaDesde : null;
      const hasta = usandoFechaPersonalizada ? fechaHasta : null;
      const [ventas, productos, rentabilidad, reparaciones, stockBajo] =
        await Promise.all([
          reportesService.getVentas(periodo, desde, hasta),
          reportesService.getProductosVendidos(),
          reportesService.getRentabilidad(periodo, desde, hasta),
          reportesService.getReparaciones(),
          reportesService.getStockBajo(),
        ]);
      setVentasData(ventas);
      setProductosData(productos);
      setRentabilidadData(rentabilidad);
      setReparacionesData(reparaciones);
      setStockBajoData(stockBajo);
    } catch (error) {
      toast.error("Error al cargar reportes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periodo, usandoFechaPersonalizada, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchData();
  }, [periodo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
            <p className="text-gray-500 text-sm mt-1">
              Estadísticas y métricas del negocio
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={usandoFechaPersonalizada}
                onChange={(e) => {
                  setUsandoFechaPersonalizada(e.target.checked);
                  if (!e.target.checked) {
                    setFechaDesde("");
                    setFechaHasta("");
                  }
                }}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-600">Rango personalizado</span>
            </label>
          </div>
        </div>

        {usandoFechaPersonalizada ? (
          <div className="flex flex-wrap gap-3 items-center bg-blue-50 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-blue-700">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-3 py-2 border border-blue-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-blue-700">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-3 py-2 border border-blue-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        ) : (
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
            {PERIODOS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  periodo === p.value
                    ? "bg-white shadow text-gray-800"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {[
          { value: "ventas", label: "Ventas", icon: BarChart2 },
          { value: "rentabilidad", label: "Rentabilidad", icon: TrendingUp },
          { value: "productos", label: "Productos", icon: Package },
          { value: "reparaciones", label: "Reparaciones", icon: Wrench },
          { value: "stock", label: "Stock Bajo", icon: AlertTriangle },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                tab === t.value
                  ? "bg-white shadow text-gray-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : (
        <>
          {/* TAB VENTAS */}
          {tab === "ventas" && ventasData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total vendido"
                  value={formatCurrency(ventasData.total)}
                  icon={DollarSign}
                  color="bg-blue-500"
                  subtitle={`${ventasData.cantidad_ventas} ventas`}
                />
                <StatCard
                  title="Ventas canceladas"
                  value={ventasData.cantidad_canceladas || 0}
                  icon={BarChart2}
                  color="bg-red-500"
                  subtitle="En el período"
                />
                <StatCard
                  title="Descuentos otorgados"
                  value={formatCurrency(ventasData.total_descuentos)}
                  icon={TrendingUp}
                  color="bg-orange-500"
                />
                <StatCard
                  title="Ticket promedio"
                  value={
                    ventasData.cantidad_ventas > 0
                      ? formatCurrency(
                          ventasData.total / ventasData.cantidad_ventas,
                        )
                      : formatCurrency(0)
                  }
                  icon={BarChart2}
                  color="bg-green-500"
                />
              </div>

              {/* Ventas por día */}
              {ventasData.por_dia?.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-700 mb-4">
                    Ventas por día
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={ventasData.por_dia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar
                        dataKey="total"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        name="Total"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Por método de pago */}
                {ventasData.por_metodo?.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-700 mb-4">
                      Por método de pago
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={ventasData.por_metodo}
                          dataKey="total"
                          nameKey="metodo"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ metodo, percent }) =>
                            `${metodo} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {ventasData.por_metodo.map((_, i) => (
                            <Cell key={i} fill={COLORES[i % COLORES.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Por sucursal */}
                {ventasData.por_sucursal?.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-700 mb-4">
                      Por sucursal
                    </h3>
                    <div className="space-y-3">
                      {ventasData.por_sucursal.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-600">
                            {s.sucursal === "sucursal_1"
                              ? "Sucursal 1"
                              : "Sucursal 2"}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${((s.total / ventasData.total) * 100).toFixed(0)}%`,
                                  backgroundColor: COLORES[i],
                                }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-800 w-24 text-right">
                              {formatCurrency(s.total)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB RENTABILIDAD */}
          {tab === "rentabilidad" && rentabilidadData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total ingresos"
                  value={formatCurrency(rentabilidadData.total_ingresos)}
                  icon={DollarSign}
                  color="bg-green-500"
                />
                <StatCard
                  title="Costo de ventas"
                  value={formatCurrency(rentabilidadData.total_costo)}
                  icon={Package}
                  color="bg-red-500"
                />
                <StatCard
                  title="Ganancia bruta"
                  value={formatCurrency(rentabilidadData.ganancia)}
                  icon={TrendingUp}
                  color="bg-blue-500"
                />
                <StatCard
                  title="Margen"
                  value={`${rentabilidadData.margen_porcentual}%`}
                  icon={BarChart2}
                  color="bg-purple-500"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-700 mb-4">
                  Resumen de rentabilidad
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={[
                      {
                        name: "Ingresos",
                        valor: rentabilidadData.total_ingresos,
                      },
                      { name: "Costo", valor: rentabilidadData.total_costo },
                      { name: "Ganancia", valor: rentabilidadData.ganancia },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                      <Cell fill="#3b82f6" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB PRODUCTOS */}
          {tab === "productos" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-700">
                    Top 10 productos más vendidos
                  </h3>
                </div>
                {productosData.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    No hay datos de ventas
                  </div>
                ) : (
                  <>
                    <div className="p-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={productosData} layout="vertical">
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                          />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis
                            dataKey="nombre"
                            type="category"
                            tick={{ fontSize: 11 }}
                            width={150}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="cantidad_total"
                            fill="#3b82f6"
                            radius={[0, 4, 4, 0]}
                            name="Cantidad"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <table className="w-full">
                      <thead className="bg-gray-50 border-t border-gray-100">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                            #
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                            Producto
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                            Cantidad
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                            Total vendido
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {productosData.map((p, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm text-gray-500">
                              {i + 1}
                            </td>
                            <td className="px-6 py-3 text-sm font-medium text-gray-800">
                              {p.nombre}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600">
                              {p.cantidad_total}
                            </td>
                            <td className="px-6 py-3 text-sm font-semibold text-gray-800">
                              {formatCurrency(p.total_vendido)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB REPARACIONES */}
          {tab === "reparaciones" && reparacionesData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total órdenes"
                  value={reparacionesData.total}
                  icon={Wrench}
                  color="bg-orange-500"
                />
                <StatCard
                  title="Canceladas"
                  value={reparacionesData.total_canceladas || 0}
                  icon={AlertTriangle}
                  color="bg-red-500"
                />
                <StatCard
                  title="Total facturado"
                  value={formatCurrency(reparacionesData.total_facturado)}
                  icon={DollarSign}
                  color="bg-green-500"
                  subtitle="Reparaciones entregadas"
                />
                <StatCard
                  title="Total cobrado"
                  value={formatCurrency(reparacionesData.total_cobrado)}
                  icon={TrendingUp}
                  color="bg-blue-500"
                />
                <StatCard
                  title="Saldo pendiente"
                  value={formatCurrency(reparacionesData.total_pendiente)}
                  icon={AlertTriangle}
                  color="bg-red-500"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-700 mb-4">
                  Órdenes por estado
                </h3>
                <div className="space-y-3">
                  {Object.entries(reparacionesData.por_estado).map(
                    ([estado, cantidad], i) => (
                      <div
                        key={estado}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-600">
                          {ESTADOS_REP[estado] || estado}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width:
                                  reparacionesData.total > 0
                                    ? `${((cantidad / reparacionesData.total) * 100).toFixed(0)}%`
                                    : "0%",
                                backgroundColor: COLORES[i % COLORES.length],
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-800 w-8 text-right">
                            {cantidad}
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB STOCK BAJO */}
          {tab === "stock" && (
            <div className="space-y-4">
              {stockBajoData.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <AlertTriangle
                    size={48}
                    className="mx-auto text-green-300 mb-3"
                  />
                  <p className="text-gray-500 font-medium">
                    Todo el stock está en niveles normales
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-500" />
                    <h3 className="font-semibold text-gray-700">
                      {stockBajoData.length} producto(s) con stock bajo
                    </h3>
                  </div>
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
                          Stock actual
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                          Stock mínimo
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                          Diferencia
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stockBajoData.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm font-medium text-gray-800">
                            {p.nombre}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">
                            {p.variante || "-"}
                          </td>
                          <td className="px-6 py-3">
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                              {p.stock_actual}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">
                            {p.stock_minimo}
                          </td>
                          <td className="px-6 py-3 text-sm font-semibold text-red-600">
                            -{p.stock_minimo - p.stock_actual}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
