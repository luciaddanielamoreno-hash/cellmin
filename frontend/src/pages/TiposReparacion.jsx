import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Wrench, ToggleLeft } from "lucide-react";
import { tiposReparacionService } from "../services/tiposReparacion.service";
import toast from "react-hot-toast";
import { formatCurrency } from "../utils/helpers";

function TipoModal({ tipo, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: tipo?.nombre || "",
    descripcion: tipo?.descripcion || "",
    precio: tipo?.precio || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...form, precio: parseFloat(form.precio) };
      if (tipo) {
        await tiposReparacionService.update(tipo.id, data);
        toast.success("Tipo actualizado");
      } else {
        await tiposReparacionService.create(data);
        toast.success("Tipo creado");
      }
      onSave();
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {tipo ? "Editar Tipo" : "Nuevo Tipo de Reparación"}
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
              placeholder="ej: Cambio de pantalla"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio *
            </label>
            <input
              type="number"
              required
              min="0"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              placeholder="$ 0.00"
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

export default function TiposReparacion() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchTipos = async () => {
    try {
      const data = await tiposReparacionService.getAll();
      setTipos(data);
    } catch (error) {
      toast.error("Error al cargar tipos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipos();
  }, []);

  const handleToggle = async (tipo) => {
    const accion = tipo.activo ? "desactivar" : "activar";
    if (
      !confirm(
        `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} este tipo de reparación?`,
      )
    )
      return;
    try {
      await tiposReparacionService.delete(tipo.id);
      toast.success(
        `Tipo ${accion === "desactivar" ? "desactivado" : "activado"}`,
      );
      fetchTipos();
    } catch (error) {
      toast.error("Error al actualizar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Tipos de Reparación
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {tipos.length} tipos registrados
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
          Nuevo Tipo
        </button>
      </div>

      {tipos.length === 0 ? (
        <div className="text-center py-12">
          <Wrench size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            No hay tipos de reparación registrados
          </p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Nombre
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Descripción
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Precio
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tipos.map((tipo) => (
                  <tr key={tipo.id} className="hover:bg-gray-50 transition-[background-color]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                          <Wrench size={14} className="text-orange-600" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">
                            {tipo.nombre}
                          </span>
                          {!tipo.activo && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-md">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tipo.descripcion || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                      {formatCurrency(tipo.precio)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelected(tipo);
                            setShowModal(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleToggle(tipo)}
                          className={`p-1.5 rounded-lg transition ${
                            tipo.activo
                              ? "text-gray-500 hover:text-red-600 hover:bg-red-50"
                              : "text-gray-500 hover:text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {tipo.activo ? (
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
            {tipos.map((tipo) => (
              <div
                key={tipo.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                      <Wrench size={16} className="text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800">
                          {tipo.nombre}
                        </p>
                        {!tipo.activo && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-md">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-700">
                        {formatCurrency(tipo.precio)}
                      </p>
                      {tipo.descripcion && (
                        <p className="text-xs text-gray-500">
                          {tipo.descripcion}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelected(tipo);
                        setShowModal(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleToggle(tipo)}
                      className={`p-2 rounded-lg transition ${
                        tipo.activo
                          ? "text-red-600 hover:bg-red-50"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {tipo.activo ? (
                        <Trash2 size={16} />
                      ) : (
                        <ToggleLeft size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <TipoModal
          tipo={selected}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchTipos();
          }}
        />
      )}
    </div>
  );
}
