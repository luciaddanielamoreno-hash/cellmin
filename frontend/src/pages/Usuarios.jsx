import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  User,
  Shield,
  UserCheck,
  Search,
} from "lucide-react";
import { usuariosService } from "../services/usuarios.service";
import toast from "react-hot-toast";

const ROLES = [
  {
    value: "administrador",
    label: "Administrador",
    color: "bg-red-100 text-red-700",
  },
  { value: "cajero", label: "Cajero", color: "bg-blue-100 text-blue-700" },
  {
    value: "vendedor",
    label: "Vendedor",
    color: "bg-green-100 text-green-700",
  },
  {
    value: "deposito",
    label: "Depósito",
    color: "bg-orange-100 text-orange-700",
  },
  {
    value: "tecnico",
    label: "Técnico",
    color: "bg-purple-100 text-purple-700",
  },
];

const SUCURSALES = [
  { value: "sucursal_1", label: "Sucursal 1" },
  { value: "sucursal_2", label: "Sucursal 2" },
];

function UsuarioModal({ usuario, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: usuario?.nombre || "",
    email: usuario?.email || "",
    password: "",
    rol: usuario?.rol || "vendedor",
    sucursales: usuario?.sucursales || ["sucursal_1"],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...form };
      if (usuario && !data.password) delete data.password;
      if (usuario) {
        await usuariosService.update(usuario.id, data);
        toast.success("Usuario actualizado");
      } else {
        await usuariosService.create(data);
        toast.success("Usuario creado");
      }
      onSave();
    } catch (error) {
      toast.error("Error al guardar el usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {usuario ? "Editar Usuario" : "Nuevo Usuario"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {usuario
                ? "Nueva contraseña (dejar vacío para no cambiar)"
                : "Contraseña *"}
            </label>
            <input
              type="password"
              required={!usuario}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={usuario ? "••••••••" : ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol *
              </label>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sucursales *
              </label>
              <div className="space-y-2">
                {[
                  { value: "sucursal_1", label: "Sucursal 1" },
                  { value: "sucursal_2", label: "Sucursal 2" },
                ].map((s) => (
                  <label
                    key={s.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.sucursales.includes(s.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({
                            ...form,
                            sucursales: [...form.sucursales, s.value],
                          });
                        } else {
                          if (form.sucursales.length === 1) return;
                          setForm({
                            ...form,
                            sucursales: form.sucursales.filter(
                              (x) => x !== s.value,
                            ),
                          });
                        }
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
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
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filtros, setFiltros] = useState({
    busqueda: "",
    estado: "",
    rol: "",
  });
  const fetchUsuarios = async () => {
    try {
      const data = await usuariosService.getAll();
      setUsuarios(data);
    } catch (error) {
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const filtered = usuarios.filter((u) => {
    if (
      filtros.busqueda &&
      !`${u.nombre} ${u.email}`
        .toLowerCase()
        .includes(filtros.busqueda.toLowerCase())
    )
      return false;
    if (filtros.estado === "activo" && !u.activo) return false;
    if (filtros.estado === "inactivo" && u.activo) return false;
    if (filtros.rol && u.rol !== filtros.rol) return false;
    return true;
  });

  const handleToggleActivo = async (usuario) => {
    const accion = usuario.activo ? "desactivar" : "activar";
    if (
      !confirm(
        `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} a ${usuario.nombre}?`,
      )
    )
      return;
    try {
      await usuariosService.delete(usuario.id);
      toast.success(
        `Usuario ${accion === "desactivar" ? "desactivado" : "activado"}`,
      );
      fetchUsuarios();
    } catch (error) {
      toast.error("Error al actualizar usuario");
    }
  };

  const getRolInfo = (rol) =>
    ROLES.find((r) => r.value === rol) || {
      label: rol,
      color: "bg-gray-100 text-gray-700",
    };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">
            {usuarios.length} usuarios registrados
          </p>
        </div>
        <button
          onClick={() => {
            setSelected(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus size={18} />
          Nuevo Usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={filtros.busqueda}
            onChange={(e) =>
              setFiltros({ ...filtros, busqueda: e.target.value })
            }
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filtros.rol}
          onChange={(e) => setFiltros({ ...filtros, rol: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={filtros.estado}
          onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <User size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No hay usuarios registrados</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Usuario
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Rol
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Sucursal
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((usuario) => {
                  const rolInfo = getRolInfo(usuario.rol);
                  return (
                    <tr
                      key={usuario.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {usuario.nombre[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-800">
                              {usuario.nombre}
                            </span>
                            {!usuario.activo && (
                              <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-md">
                                Inactivo
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {usuario.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-medium ${rolInfo.color}`}
                        >
                          {rolInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {usuario.sucursales?.length > 1
                          ? "Ambas sucursales"
                          : usuario.sucursales?.[0] === "sucursal_1"
                            ? "Sucursal 1"
                            : "Sucursal 2"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            usuario.activo
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {usuario.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelected(usuario);
                              setShowModal(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleActivo(usuario)}
                            className={`p-1.5 rounded-lg transition ${
                              usuario.activo
                                ? "text-gray-500 hover:text-red-600 hover:bg-red-50"
                                : "text-gray-500 hover:text-green-600 hover:bg-green-50"
                            }`}
                            title={usuario.activo ? "Desactivar" : "Activar"}
                          >
                            {usuario.activo ? (
                              <Trash2 size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map((usuario) => {
              const rolInfo = getRolInfo(usuario.rol);
              return (
                <div
                  key={usuario.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {usuario.nombre[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800">
                            {usuario.nombre}
                          </p>
                          {!usuario.activo && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-md">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{usuario.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelected(usuario);
                          setShowModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActivo(usuario)}
                        className={`p-2 rounded-lg transition ${
                          usuario.activo
                            ? "text-red-600 hover:bg-red-50"
                            : "text-green-600 hover:bg-green-50"
                        }`}
                      >
                        {usuario.activo ? (
                          <Trash2 size={16} />
                        ) : (
                          <UserCheck size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${rolInfo.color}`}
                    >
                      {rolInfo.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {usuario.sucursales?.length > 1
                        ? "Ambas sucursales"
                        : usuario.sucursales?.[0] === "sucursal_1"
                          ? "Sucursal 1"
                          : "Sucursal 2"}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        usuario.activo
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <UsuarioModal
          usuario={selected}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchUsuarios();
          }}
        />
      )}
    </div>
  );
}
