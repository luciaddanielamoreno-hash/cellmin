import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Truck,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  ToggleLeft,
  Phone,
  Mail,
  User,
  ExternalLink,
  X,
} from "lucide-react";
import { comprasService } from "../services/compras.service";
import { proveedoresService } from "../services/proveedores.service";
import { productosService } from "../services/productos.service";
import toast from "react-hot-toast";
import Paginacion from "../components/ui/Paginacion";
import ThOrdenable from "../components/ui/ThOrdenable";
import { useTabla } from "../hooks/useTabla";
import { formatCurrency, formatDateTime } from "../utils/helpers";
import DetalleCompra from "../components/ui/DetalleCompra";

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

function NuevaCompraModal({ onClose, onSave }) {
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({
    proveedor_id: "",
    numero_remito: "",
    notas: "",
    items: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([proveedoresService.getAll(), productosService.getAll()]).then(
      ([provs, prods]) => {
        setProveedores(provs);
        setProductos(prods);
      },
    );
  }, []);

  const agregarItem = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          producto_id: "",
          variante_nombre: "",
          nombre_producto: "",
          cantidad: 1,
          precio_unitario: 0,
          subtotal: 0,
        },
      ],
    });
  };

  const eliminarItem = (index) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "producto_id") {
      const producto = productos.find((p) => p.id === value);
      newItems[index].nombre_producto = producto?.nombre || "";
      newItems[index].variante_nombre = "";
      if (!producto?.tiene_variantes) {
        newItems[index].precio_unitario = producto?.precio_costo || 0;
      }
    }

    if (field === "variante_nombre") {
      const producto = productos.find(
        (p) => p.id === newItems[index].producto_id,
      );
      const variante = producto?.variantes?.find((v) => v.nombre === value);
      if (variante)
        newItems[index].precio_unitario = variante.precio_costo || 0;
    }

    if (field === "cantidad" || field === "precio_unitario") {
      newItems[index].subtotal =
        newItems[index].cantidad * newItems[index].precio_unitario;
    }

    setForm({ ...form, items: newItems });
  };

  const total = form.items.reduce(
    (acc, item) => acc + item.cantidad * item.precio_unitario,
    0,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.items.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }
    setLoading(true);
    try {
      const data = {
        ...form,
        total,
        items: form.items.map((item) => ({
          ...item,
          cantidad: parseInt(item.cantidad),
          precio_unitario: parseFloat(item.precio_unitario),
          subtotal: parseInt(item.cantidad) * parseFloat(item.precio_unitario),
          variante_nombre: item.variante_nombre || null,
        })),
      };
      await comprasService.create(data);
      toast.success("Compra registrada correctamente");
      onSave();
    } catch (error) {
      toast.error("Error al registrar la compra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-800">Nueva Compra</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor *
              </label>
              <select
                required
                value={form.proveedor_id}
                onChange={(e) =>
                  setForm({ ...form, proveedor_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de remito
              </label>
              <input
                type="text"
                value={form.numero_remito}
                onChange={(e) =>
                  setForm({ ...form, numero_remito: e.target.value })
                }
                placeholder="ej: R-0001"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Productos
              </span>
              <button
                type="button"
                onClick={agregarItem}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus size={16} />
                Agregar producto
              </button>
            </div>

            {form.items.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded-xl">
                No hay productos. Hacé click en "Agregar producto".
              </p>
            )}

            {form.items.map((item, index) => {
              const productoSel = productos.find(
                (p) => p.id === item.producto_id,
              );
              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Producto *
                      </label>
                      <select
                        required
                        value={item.producto_id}
                        onChange={(e) =>
                          updateItem(index, "producto_id", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar</option>
                        {productos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {productoSel?.tiene_variantes && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Variante *
                        </label>
                        <select
                          required
                          value={item.variante_nombre}
                          onChange={(e) =>
                            updateItem(index, "variante_nombre", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Seleccionar variante</option>
                          {productoSel.variantes.map((v) => (
                            <option key={v.nombre} value={v.nombre}>
                              {v.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.cantidad}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "cantidad",
                            parseInt(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Precio unitario *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={item.precio_unitario}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "precio_unitario",
                            parseFloat(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Subtotal:{" "}
                      {formatCurrency(item.cantidad * item.precio_unitario)}
                    </span>
                    <button
                      type="button"
                      onClick={() => eliminarItem(index)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
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

          {/* Total */}
          <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
            <span className="font-semibold text-gray-700">
              Total de la compra
            </span>
            <span className="text-xl font-bold text-blue-700">
              {formatCurrency(total)}
            </span>
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
              {loading ? "Registrando..." : "Registrar Compra"}
            </button>
          </div>
        </form>
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
            Volver
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

function ModalDetalleCompra({ compra, proveedor, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Compra {compra.numero_compra}
          </h2>
          <div className="flex items-center gap-3">
            <a
              href={`/compras/${compra._id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink size={14} />
              Pestaña nueva
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto">
          <DetalleCompra compra={compra} proveedor={proveedor} />
        </div>
        <div className="flex justify-end p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function FilaCompra({ compra, proveedores, onCancel, onVerDetalle }) {
  const [expandido, setExpandido] = useState(false);
  const proveedor = proveedores.find((p) => p.id === compra.proveedor_id);
  const cancelada = compra.estado === "cancelada";

  return (
    <>
      <tr
        className="hover:bg-gray-50 transition cursor-pointer"
        onClick={() => setExpandido(!expandido)}
      >
        <td className="px-6 py-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVerDetalle(compra);
            }}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
          >
            {compra.numero_compra}
          </button>
        </td>
        <td className="px-6 py-4 text-sm text-gray-700">
          {proveedor?.nombre || "-"}
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {compra.items?.length || 0}
        </td>
        <td
          className={`px-6 py-4 text-sm font-semibold ${cancelada ? "text-gray-400 line-through" : "text-gray-800"}`}
        >
          {formatCurrency(compra.total)}
        </td>
        <td className="px-6 py-4 text-sm text-gray-500">
          {compra.fecha ? formatDateTime(compra.fecha) : "-"}
        </td>
        <td className="px-6 py-4">
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium ${
              cancelada
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {cancelada ? "Cancelada" : "Completada"}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            {!cancelada && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(compra._id, compra.numero_compra);
                }}
                className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
              >
                Cancelar
              </button>
            )}
            <a
              href={`/compras/${compra._id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Ver detalle en pestaña nueva"
              className="p-1 text-gray-400 hover:text-blue-600"
            >
              <ExternalLink size={16} />
            </a>
            {expandido ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </div>
        </td>
      </tr>
      {expandido && (
        <tr>
          <td colSpan={7} className="px-6 pb-4 bg-gray-50">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                      Producto
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                      Variante
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                      Cantidad
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                      Precio unit.
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {compra.items?.map((item, i) => (
                    <tr key={i} className="bg-white">
                      <td className="px-4 py-2 font-medium text-gray-700">
                        {item.nombre_producto}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {item.variante_nombre || "-"}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {item.cantidad}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {formatCurrency(item.precio_unitario)}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-700">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {compra.numero_remito && (
                <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
                  Remito: {compra.numero_remito}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function CardCompraMobile({ compra, proveedor, onCancel, onVerDetalle }) {
  const [expandido, setExpandido] = useState(false);
  const cancelada = compra.estado === "cancelada";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => onVerDetalle(compra)}
            className="font-medium text-blue-600 hover:underline"
          >
            {compra.numero_compra}
          </button>
          <span
            className={`text-sm font-bold ${cancelada ? "text-gray-400 line-through" : "text-gray-800"}`}
          >
            {formatCurrency(compra.total)}
          </span>
        </div>
        {cancelada && (
          <span className="inline-block mb-2 px-2 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700">
            Cancelada
          </span>
        )}
        <div className="space-y-1 text-sm text-gray-600">
          <p className="font-medium text-gray-700">
            {proveedor?.nombre || "-"}
          </p>
          <p className="text-xs text-gray-400">
            {compra.fecha ? formatDateTime(compra.fecha) : "-"}
          </p>
          <p className="text-xs text-gray-500">
            {compra.items?.length || 0} productos
          </p>
          {compra.numero_remito && (
            <p className="text-xs text-gray-400">
              Remito: {compra.numero_remito}
            </p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setExpandido(!expandido)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expandido ? "Ocultar detalle" : "Ver detalle"}
          </button>
          <a
            href={`/compras/${compra._id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver detalle en pestaña nueva"
            className="p-1 text-gray-400 hover:text-blue-600"
          >
            <ExternalLink size={16} />
          </a>
          {!cancelada && (
            <button
              onClick={() => onCancel(compra._id, compra.numero_compra)}
              className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {expandido && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-2">
          {compra.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-600">
              <div>
                <span className="font-medium">{item.nombre_producto}</span>
                {item.variante_nombre && (
                  <span className="text-gray-400">
                    {" "}
                    — {item.variante_nombre}
                  </span>
                )}
                <span className="text-gray-400"> x{item.cantidad}</span>
              </div>
              <span className="font-medium">
                {formatCurrency(item.subtotal)}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold text-gray-800 border-t border-gray-200 pt-2">
            <span>Total</span>
            <span>{formatCurrency(compra.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function GestionProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const filtered = proveedores.filter((p) => {
    if (
      busqueda &&
      !`${p.nombre} ${p.cuit} ${p.contacto}`
        .toLowerCase()
        .includes(busqueda.toLowerCase())
    )
      return false;
    if (filtroEstado === "activo" && !p.activo) return false;
    if (filtroEstado === "inactivo" && p.activo) return false;
    return true;
  });

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


  const tabla = useTabla(filtered, {
    porPagina: 20,
    ordenInicial: { campo: "nombre", dir: "asc" },
    accessors: {

    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setSelected(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus size={18} />
          Nuevo Proveedor
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por nombre o CUIT..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : proveedores.length === 0 ? (
        <div className="text-center py-12">
          <Truck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No hay proveedores registrados</p>
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
                            setSelected(proveedor);
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
                  <div className="flex items-center gap-3">
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
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelected(proveedor);
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
          proveedor={selected}
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

export default function Compras() {
  const [tab, setTab] = useState("compras");
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [compraCancelar, setCompraCancelar] = useState(null);
  const [compraDetalle, setCompraDetalle] = useState(null);

  const fetchData = async () => {
    try {
      const [comps, provs] = await Promise.all([
        comprasService.getAll(),
        proveedoresService.getAll(),
      ]);
      setCompras(comps);
      setProveedores(provs);
    } catch (error) {
      toast.error("Error al cargar compras");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = compras.filter(
    (c) =>
      c.numero_compra?.toLowerCase().includes(search.toLowerCase()) ||
      proveedores
        .find((p) => p.id === c.proveedor_id)
        ?.nombre?.toLowerCase()
        .includes(search.toLowerCase()),
  );

  const handleCancelar = async () => {
    try {
      await comprasService.cancelar(compraCancelar.id);
      toast.success("Compra cancelada y stock revertido");
      setCompraCancelar(null);
      fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Error al cancelar la compra",
      );
      setCompraCancelar(null);
    }
  };


  const tabla = useTabla(filtered, {
    porPagina: 20,
    ordenInicial: { campo: "fecha", dir: "desc" },
    accessors: {
      proveedor: (c) => proveedores.find((p) => p.id === c.proveedor_id)?.nombre || "",
      cantidad: (c) => c.items?.length || 0,
      fecha: (c) => (c.fecha ? new Date(c.fecha).getTime() : null)
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Compras</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("compras")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "compras"
              ? "bg-white shadow text-gray-800"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Compras
        </button>
        <button
          onClick={() => setTab("proveedores")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "proveedores"
              ? "bg-white shadow text-gray-800"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Proveedores
        </button>
      </div>

      {tab === "proveedores" ? (
        <GestionProveedores />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              {compras.length} compras registradas
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus size={18} />
              Nueva Compra
            </button>
          </div>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por número o proveedor..."
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
              <p className="text-gray-500">No hay compras registradas</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <ThOrdenable campo="numero_compra" tabla={tabla} className="px-6 py-3">Número</ThOrdenable>
                      <ThOrdenable campo="proveedor" tabla={tabla} className="px-6 py-3">Proveedor</ThOrdenable>
                      <ThOrdenable campo="cantidad" tabla={tabla} className="px-6 py-3">Cant.</ThOrdenable>
                      <ThOrdenable campo="total" tabla={tabla} className="px-6 py-3">Total</ThOrdenable>
                      <ThOrdenable campo="fecha" tabla={tabla} className="px-6 py-3">Fecha</ThOrdenable>
                      <ThOrdenable campo="estado" tabla={tabla} className="px-6 py-3">Estado</ThOrdenable>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tabla.filas.map((compra) => (
                      <FilaCompra
                        key={compra._id}
                        compra={compra}
                        proveedores={proveedores}
                        onVerDetalle={setCompraDetalle}
                        onCancel={(id, numero) =>
                          setCompraCancelar({ id, numero })
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {tabla.filas.map((compra) => {
                  const proveedor = proveedores.find(
                    (p) => p.id === compra.proveedor_id,
                  );
                  return (
                    <CardCompraMobile
                      key={compra._id}
                      compra={compra}
                      proveedor={proveedor}
                      onVerDetalle={setCompraDetalle}
                      onCancel={(id, numero) =>
                        setCompraCancelar({ id, numero })
                      }
                    />
                  );
                })}
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
            <NuevaCompraModal
              onClose={() => setShowModal(false)}
              onSave={() => {
                setShowModal(false);
                fetchData();
              }}
            />
          )}
        </div>
      )}

      {compraDetalle && (
        <ModalDetalleCompra
          compra={compraDetalle}
          proveedor={proveedores.find(
            (p) => p.id === compraDetalle.proveedor_id,
          )}
          onClose={() => setCompraDetalle(null)}
        />
      )}

      {compraCancelar && (
        <ModalConfirmar
          mensaje={`¿Cancelar la compra ${compraCancelar.numero}? Se va a restar el stock que había sumado.`}
          onConfirmar={handleCancelar}
          onCancelar={() => setCompraCancelar(null)}
        />
      )}
    </div>
  );
}
