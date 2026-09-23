import { useState, useEffect } from "react";
import { Search, Shield, Filter } from "lucide-react";
import { auditoriaService } from "../services/auditoria.service";
import { usuariosService } from "../services/usuarios.service";
import { formatDateTime } from "../utils/helpers";
import toast from "react-hot-toast";

const MODULOS = [
  "autenticacion",
  "ventas",
  "reparaciones",
  "productos",
  "clientes",
  "usuarios",
  "caja",
  "compras",
  "stock",
];

const ACCIONES = [
  "login",
  "crear",
  "actualizar",
  "cancelar",
  "abrir",
  "cerrar",
  "activar_desactivar",
];

const ACCION_LABEL = {
  login: "Inicio de sesión",
  crear: "Crear",
  actualizar: "Actualizar",
  cancelar: "Cancelar",
  abrir: "Abrir",
  cerrar: "Cerrar",
  activar_desactivar: "Activar/Desactivar",
};

const ACCION_COLOR = {
  login: "bg-blue-100 text-blue-700",
  crear: "bg-green-100 text-green-700",
  actualizar: "bg-yellow-100 text-yellow-700",
  cancelar: "bg-red-100 text-red-700",
  abrir: "bg-purple-100 text-purple-700",
  cerrar: "bg-orange-100 text-orange-700",
  activar_desactivar: "bg-gray-100 text-gray-700",
};

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFiltros, setShowFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    busqueda: "",
    modulo: "",
    accion: "",
    usuario_id: "",
  });

  const fetchData = async () => {
    try {
      const [logsData, usuariosData] = await Promise.all([
        auditoriaService.getAll({ limit: 500 }),
        usuariosService.getAll(),
      ]);
      setLogs(logsData);
      setUsuarios(usuariosData);
    } catch (error) {
      toast.error("Error al cargar auditoría");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const limpiarFiltros = () =>
    setFiltros({ busqueda: "", modulo: "", accion: "", usuario_id: "" });
  const filtrosActivos = Object.values(filtros).some((v) => v !== "");

  const filtered = logs.filter((log) => {
    if (
      filtros.busqueda &&
      !log.descripcion.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
      !log.usuario_nombre.toLowerCase().includes(filtros.busqueda.toLowerCase())
    )
      return false;
    if (filtros.modulo && log.modulo !== filtros.modulo) return false;
    if (filtros.accion && log.accion !== filtros.accion) return false;
    if (filtros.usuario_id && log.usuario_id !== filtros.usuario_id)
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Auditoría</h1>
          <p className="text-gray-500 text-sm mt-1">{logs.length} registros</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
        >
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por descripción o usuario..."
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

        {showFiltros && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Módulo
              </label>
              <select
                value={filtros.modulo}
                onChange={(e) =>
                  setFiltros({ ...filtros, modulo: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {MODULOS.map((m) => (
                  <option key={m} value={m}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Acción
              </label>
              <select
                value={filtros.accion}
                onChange={(e) =>
                  setFiltros({ ...filtros, accion: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {ACCIONES.map((a) => (
                  <option key={a} value={a}>
                    {ACCION_LABEL[a]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Usuario
              </label>
              <select
                value={filtros.usuario_id}
                onChange={(e) =>
                  setFiltros({ ...filtros, usuario_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {filtrosActivos && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <span className="text-sm text-blue-700">
              {filtered.length} registros encontrados
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Shield size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No hay registros de auditoría</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Usuario
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Módulo
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Acción
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {formatDateTime(log.fecha)}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {log.usuario_nombre || "-"}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {log.rol}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 capitalize">
                        {log.modulo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${ACCION_COLOR[log.accion] || "bg-gray-100 text-gray-700"}`}
                      >
                        {ACCION_LABEL[log.accion] || log.accion}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {log.descripcion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map((log, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${ACCION_COLOR[log.accion] || "bg-gray-100 text-gray-700"}`}
                  >
                    {ACCION_LABEL[log.accion] || log.accion}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(log.fecha)}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 mb-1">
                  {log.descripcion}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="capitalize">{log.modulo}</span>
                  <span>·</span>
                  <span>{log.usuario_nombre || "-"}</span>
                  <span>·</span>
                  <span className="capitalize">{log.rol}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
