import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Truck,
  Phone,
  Mail,
  User,
  ToggleLeft,
} from "lucide-react";
import { proveedoresService } from "../services/proveedores.service";
import toast from "react-hot-toast";
import Paginacion from "../components/ui/Paginacion";
import ThOrdenable from "../components/ui/ThOrdenable";
import { useTabla } from "../hooks/useTabla";

function ProveedorModal({ proveedor, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: proveedor?.nombre || "",
    cuit: proveedor?.cuit || "",
    telefono: proveedor?.telefono || "",
    email: proveedor?.email || "",
    direccion: proveedor?.direccion || "",
    contacto: proveedor?.contacto || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (proveedor) {
        await proveedoresService.update(proveedor.id, form);
        toast.success("Proveedor actualizado");
      } else {
        await proveedoresService.create(form);
        toast.success("Proveedor creado");
      }
      onSave();
    } catch (error) {
      toast.error("Error al guardar el proveedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {proveedor ? "Editar Proveedor" : "Nuevo Proveedor"}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CUIT
              </label>
              <input
                type="text"
                value={form.cuit}
                onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                placeholder="XX-XXXXXXXX-X"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Persona de contacto
            </label>
            <input
              type="text"
              value={form.contacto}
              onChange={(e) => setForm({ ...form, contacto: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState(null);

  const fetchProveedores = async () => {
    try {
      const data = await proveedoresService.getAll();
      setProveedores(data);
    } catch (error) {
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  const handleToggle = async (proveedor) => {
    const accion = proveedor.activo ? "desactivar" : "activar";
    if (
      !confirm(
        `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} a ${proveedor.nombre}?`,
      )
    )
      return;
    try {
      await proveedoresService.delete(proveedor.id);
      toast.success(
        `Proveedor ${accion === "desactivar" ? "desactivado" : "activado"}`,
      );
      fetchProveedores();
    } catch (error) {
      toast.error("Error al actualizar");
    }
  };

  const filtered = proveedores.filter((p) =>
    `${p.nombre} ${p.cuit} ${p.contacto}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );


  const tabla = useTabla(filtered, {
    porPagina: 20,
    ordenInicial: { campo: "nombre", dir: "asc" },
    accessors: {

    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Proveedores</h1>
          <p className="text-gray-500 text-sm mt-1">
            {proveedores.length} proveedores registrados
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedProveedor(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus size={18} />
          Nuevo Proveedor
        </button>
      </div>

      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Buscar por nombre o CUIT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Truck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No se encontraron proveedores</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <ThOrdenable campo="nombre" tabla={tabla} className="px-6 py-3">Proveedor</ThOrdenable>
                  <ThOrdenable campo="cuit" tabla={tabla} className="px-6 py-3">CUIT</ThOrdenable>
                  <ThOrdenable campo="contacto" tabla={tabla} className="px-6 py-3">Contacto</ThOrdenable>
                  <ThOrdenable campo="telefono" tabla={tabla} className="px-6 py-3">Teléfono</ThOrdenable>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tabla.filas.map((proveedor) => (
                  <tr
                    key={proveedor.id}
                    className="hover:bg-gray-50 transition-[background-color]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                          <Truck size={16} className="text-orange-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800">
                              {proveedor.nombre}
                            </p>
                            {!proveedor.activo && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-md">
                                Inactivo
                              </span>
                            )}
                          </div>
                          {proveedor.email && (
                            <p className="text-xs text-gray-400">
                              {proveedor.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {proveedor.cuit || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {proveedor.contacto || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {proveedor.telefono || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedProveedor(proveedor);
                            setShowModal(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleToggle(proveedor)}
                          className={`p-1.5 rounded-lg transition ${
                            proveedor.activo
                              ? "text-gray-500 hover:text-red-600 hover:bg-red-50"
                              : "text-gray-500 hover:text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {proveedor.activo ? (
                            <Trash2 size={16} />
                          ) : (
                            <ToggleLeft size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {tabla.filas.map((proveedor) => (
              <div
                key={proveedor.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                    <Truck size={18} className="text-orange-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">
                        {proveedor.nombre}
                      </p>
                      {!proveedor.activo && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-md">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      CUIT: {proveedor.cuit || "-"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedProveedor(proveedor);
                        setShowModal(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleToggle(proveedor)}
                      className={`p-2 rounded-lg transition ${
                        proveedor.activo
                          ? "text-red-600 hover:bg-red-50"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {proveedor.activo ? (
                        <Trash2 size={16} />
                      ) : (
                        <ToggleLeft size={16} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {proveedor.contacto && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User size={14} />
                      {proveedor.contacto}
                    </div>
                  )}
                  {proveedor.telefono && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={14} />
                      {proveedor.telefono}
                    </div>
                  )}
                  {proveedor.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail size={14} />
                      {proveedor.email}
                    </div>
                  )}
                </div>
              </div>
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
        <ProveedorModal
          proveedor={selectedProveedor}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchProveedores();
          }}
        />
      )}
    </div>
  );
}
