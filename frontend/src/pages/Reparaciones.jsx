import { tiposReparacionService } from "../services/tiposReparacion.service";
import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Wrench,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Edit,
  Trash2,
  ToggleLeft,
} from "lucide-react";
import { reparacionesService } from "../services/reparaciones.service";
import { clientesService } from "../services/clientes.service";
import toast from "react-hot-toast";
import { formatCurrency, formatDateTime, METODOS_PAGO } from "../utils/helpers";
import { cajaService } from "../services/caja.service";
import { useAuth } from "../context/AuthContext";
import OrdenReparacion from "../components/ui/OrdenReparacion";

const ESTADOS_REP = {
  en_diagnostico: {
    label: "En diagnóstico",
    color: "bg-gray-100 text-gray-700",
  },
  ingresada: { label: "Ingresada", color: "bg-blue-100 text-blue-700" },
  en_reparacion: {
    label: "En reparación",
    color: "bg-yellow-100 text-yellow-700",
  },
  lista: { label: "Lista para entregar", color: "bg-green-100 text-green-700" },
  entregada: { label: "Entregada", color: "bg-gray-100 text-gray-500" },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

function NuevoClienteModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    telefono: "",
    email: "",
    direccion: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cliente = await clientesService.create(form);
      toast.success("Cliente creado");
      onSave(cliente);
    } catch (error) {
      toast.error("Error al crear cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Nuevo Cliente</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
                Apellido
              </label>
              <input
                type="text"
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DNI
              </label>
              <input
                type="text"
                value={form.dni}
                onChange={(e) => setForm({ ...form, dni: e.target.value })}
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

function SelectorTipos({ tiposDisponibles, tiposSeleccionados, onToggle }) {
  const [busqueda, setBusqueda] = useState("");

  const tiposFiltrados = tiposDisponibles.filter((t) =>
    t.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const precioTotal = tiposSeleccionados.reduce((acc, t) => acc + t.precio, 0);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Buscar tipo de reparación..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {tiposFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No se encontraron tipos
          </p>
        ) : (
          tiposFiltrados.map((tipo) => {
            const seleccionado = tiposSeleccionados.find(
              (t) => t.tipo_id === tipo.id,
            );
            return (
              <button
                key={tipo.id}
                type="button"
                onClick={() => onToggle(tipo)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition text-left ${
                  seleccionado
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      seleccionado
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {seleccionado && (
                      <span className="text-white text-xs">✓</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {tipo.nombre}
                    </p>
                    {tipo.descripcion && (
                      <p className="text-xs text-gray-500">
                        {tipo.descripcion}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`text-sm font-bold ml-2 shrink-0 ${seleccionado ? "text-blue-600" : "text-gray-600"}`}
                >
                  {formatCurrency(tipo.precio)}
                </span>
              </button>
            );
          })
        )}
      </div>
      {tiposSeleccionados.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-3">
          <div className="space-y-1 mb-2">
            {tiposSeleccionados.map((t, i) => (
              <div
                key={i}
                className="flex justify-between text-xs text-blue-700"
              >
                <span>{t.nombre}</span>
                <span className="font-medium">{formatCurrency(t.precio)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-bold text-blue-800 border-t border-blue-200 pt-2">
            <span>Total</span>
            <span>{formatCurrency(precioTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function NuevaReparacionModal({ onClose, onSave }) {
  const [clientes, setClientes] = useState([]);
  const [tiposDisponibles, setTiposDisponibles] = useState([]);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [tiposSeleccionados, setTiposSeleccionados] = useState([]);
  const [form, setForm] = useState({
    cliente_id: "",
    equipo: { marca: "", modelo: "", imei: "", problema_descripcion: "" },
    notas_internas: "",
    garantia_dias: 90,
    sucursal: "sucursal_1",
    estado: "en_diagnostico",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      clientesService.getAll(),
      tiposReparacionService.getAll(),
    ]).then(([clients, tipos]) => {
      setClientes(clients);
      setTiposDisponibles(tipos);
    });
  }, []);

  const toggleTipo = (tipo) => {
    const existe = tiposSeleccionados.find((t) => t.tipo_id === tipo.id);
    if (existe) {
      setTiposSeleccionados(
        tiposSeleccionados.filter((t) => t.tipo_id !== tipo.id),
      );
    } else {
      setTiposSeleccionados([
        ...tiposSeleccionados,
        {
          tipo_id: tipo.id,
          nombre: tipo.nombre,
          precio: tipo.precio,
        },
      ]);
    }
  };

  const precioTotal = tiposSeleccionados.reduce((acc, t) => acc + t.precio, 0);

  // Si hay tipos seleccionados el estado pasa a ingresada, si no en_diagnostico
  const estadoFinal =
    tiposSeleccionados.length > 0 ? "ingresada" : "en_diagnostico";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cliente_id) {
      toast.error("Seleccioná un cliente");
      return;
    }
    setLoading(true);
    try {
      await reparacionesService.create({
        ...form,
        tipos_reparacion: tiposSeleccionados,
        estado: estadoFinal,
      });
      toast.success("Orden creada correctamente");
      onSave();
    } catch (error) {
      toast.error("Error al crear la orden");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-100 sticky top-0 bg-white flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Nueva Orden de Reparación
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Cliente */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Cliente *
                </label>
                <button
                  type="button"
                  onClick={() => setShowNuevoCliente(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Nuevo cliente
                </button>
              </div>
              <select
                required
                value={form.cliente_id}
                onChange={(e) =>
                  setForm({ ...form, cliente_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellido || ""}{" "}
                    {c.telefono ? `— ${c.telefono}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Equipo */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Datos del equipo
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Marca *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.equipo.marca}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        equipo: { ...form.equipo, marca: e.target.value },
                      })
                    }
                    placeholder="Samsung, Apple..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.equipo.modelo}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        equipo: { ...form.equipo, modelo: e.target.value },
                      })
                    }
                    placeholder="Galaxy A54..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    IMEI
                  </label>
                  <input
                    type="text"
                    value={form.equipo.imei}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        equipo: { ...form.equipo, imei: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Garantía (días)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.garantia_dias}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        garantia_dias: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Descripción del problema
                </label>
                <textarea
                  value={form.equipo.problema_descripcion}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      equipo: {
                        ...form.equipo,
                        problema_descripcion: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  placeholder="Describí el problema si ya se conoce..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Tipos de reparación */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Tipos de reparación
                <span className="text-xs text-gray-400 ml-2">
                  (opcional si no se conoce el problema)
                </span>
              </p>
              {tiposDisponibles.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded-xl">
                  No hay tipos cargados. Cargalos desde "Tipos de Reparación".
                </p>
              ) : (
                <SelectorTipos
                  tiposDisponibles={tiposDisponibles}
                  tiposSeleccionados={tiposSeleccionados}
                  onToggle={toggleTipo}
                />
              )}
            </div>

            {/* Estado automático */}
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
              <span className="text-sm text-gray-600">Estado inicial:</span>
              <span
                className={`px-2 py-1 rounded-lg text-xs font-medium ${ESTADOS_REP[estadoFinal]?.color}`}
              >
                {ESTADOS_REP[estadoFinal]?.label}
              </span>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas internas
              </label>
              <textarea
                value={form.notas_internas}
                onChange={(e) =>
                  setForm({ ...form, notas_internas: e.target.value })
                }
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
                {loading ? "Creando..." : "Crear Orden"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showNuevoCliente && (
        <NuevoClienteModal
          onClose={() => setShowNuevoCliente(false)}
          onSave={(nuevoCliente) => {
            setClientes((prev) => [...prev, nuevoCliente]);
            setForm((f) => ({ ...f, cliente_id: nuevoCliente.id }));
            setShowNuevoCliente(false);
            toast.success("Cliente agregado y seleccionado");
          }}
        />
      )}
    </>
  );
}

function EditarTiposModal({ reparacion, tiposDisponibles, onClose, onSave }) {
  const [tiposSeleccionados, setTiposSeleccionados] = useState(
    reparacion.tipos_reparacion || [],
  );
  const [loading, setLoading] = useState(false);

  const toggleTipo = (tipo) => {
    const existe = tiposSeleccionados.find((t) => t.tipo_id === tipo.id);
    if (existe) {
      setTiposSeleccionados(
        tiposSeleccionados.filter((t) => t.tipo_id !== tipo.id),
      );
    } else {
      setTiposSeleccionados([
        ...tiposSeleccionados,
        {
          tipo_id: tipo.id,
          nombre: tipo.nombre,
          precio: tipo.precio,
        },
      ]);
    }
  };

  const precioTotal = tiposSeleccionados.reduce((acc, t) => acc + t.precio, 0);

  const handleSubmit = async () => {
    if (tiposSeleccionados.length === 0) {
      toast.error("Seleccioná al menos un tipo");
      return;
    }
    setLoading(true);
    try {
      await reparacionesService.update(reparacion.id, {
        tipos_reparacion: tiposSeleccionados,
        estado: "ingresada",
      });
      toast.success("Reparación actualizada");
      onSave();
    } catch (error) {
      toast.error("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Definir reparaciones — {reparacion.numero_orden}
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tiposDisponibles.map((tipo) => {
              const seleccionado = tiposSeleccionados.find(
                (t) => t.tipo_id === tipo.id,
              );
              return (
                <button
                  key={tipo.id}
                  type="button"
                  onClick={() => toggleTipo(tipo)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition text-left ${
                    seleccionado
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {tipo.nombre}
                    </p>
                    {tipo.descripcion && (
                      <p className="text-xs text-gray-500">
                        {tipo.descripcion}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-sm font-bold ml-2 ${seleccionado ? "text-blue-600" : "text-gray-600"}`}
                  >
                    {formatCurrency(tipo.precio)}
                  </span>
                </button>
              );
            })}
          </div>

          {tiposSeleccionados.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 flex justify-between">
              <span className="text-sm text-blue-700">
                {tiposSeleccionados.length} reparación(es)
              </span>
              <span className="font-bold text-blue-700">
                {formatCurrency(precioTotal)}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:bg-blue-400 transition"
            >
              {loading ? "Guardando..." : "Confirmar y pasar a Ingresada"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PagoModal({ reparacion, onClose, onSave }) {
  const saldo = reparacion.saldo_pendiente || 0;
  const [pagoMixto, setPagoMixto] = useState(false);
  const [pagos, setPagos] = useState([{ metodo: "efectivo", monto: saldo }]);
  const [loading, setLoading] = useState(false);

  const togglePagoMixto = (value) => {
    setPagoMixto(value);
    if (value) {
      setPagos([
        { metodo: "efectivo", monto: "" },
        { metodo: "transferencia", monto: "" },
      ]);
    } else {
      setPagos([{ metodo: "efectivo", monto: saldo }]);
    }
  };

  const handlePagoChange = (index, field, value) => {
    const newPagos = [...pagos];
    newPagos[index] = { ...newPagos[index], [field]: value };
    setPagos(newPagos);
  };

  const totalPagado = pagos.reduce(
    (acc, p) => acc + (parseFloat(p.monto) || 0),
    0,
  );
  const diferencia = pagoMixto ? totalPagado - saldo : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pagoMixto && Math.abs(diferencia) > 0.01) {
      toast.error(
        `El total pagado (${formatCurrency(totalPagado)}) no coincide con el saldo (${formatCurrency(saldo)})`,
      );
      return;
    }
    setLoading(true);
    try {
      if (pagoMixto) {
        for (const pago of pagos) {
          if (parseFloat(pago.monto) > 0) {
            await reparacionesService.agregarPago(reparacion.id, {
              monto: parseFloat(pago.monto),
              tipo: "total",
              metodo: pago.metodo,
            });
          }
        }
      } else {
        await reparacionesService.agregarPago(reparacion.id, {
          monto: parseFloat(pagos[0].monto),
          tipo: "total",
          metodo: pagos[0].metodo,
        });
      }
      toast.success("Pago registrado");
      onSave();
    } catch (error) {
      toast.error("Error al registrar pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Registrar Pago — {reparacion.numero_orden}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total reparación</span>
              <span className="font-medium">
                {formatCurrency(reparacion.precio_total || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total pagado</span>
              <span className="font-medium text-green-600">
                {formatCurrency(reparacion.total_pagado || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1">
              <span className="text-gray-700">Saldo a cobrar</span>
              <span className="text-red-600">{formatCurrency(saldo)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Método de pago
            </label>
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

          <div className="space-y-2">
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
                <input
                  type="number"
                  min="0"
                  value={pago.monto}
                  onChange={(e) =>
                    handlePagoChange(index, "monto", e.target.value)
                  }
                  placeholder="$ 0.00"
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          {pagoMixto && (
            <div
              className={`flex justify-between text-sm px-3 py-2 rounded-xl ${
                Math.abs(diferencia) < 0.01
                  ? "bg-green-50 text-green-700"
                  : diferencia > 0
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-red-50 text-red-700"
              }`}
            >
              <span>
                {Math.abs(diferencia) < 0.01
                  ? "✓ Monto correcto"
                  : diferencia > 0
                    ? "Excede el saldo"
                    : "Falta completar"}
              </span>
              {Math.abs(diferencia) >= 0.01 && (
                <span className="font-bold">
                  {formatCurrency(Math.abs(diferencia))}
                </span>
              )}
            </div>
          )}

          <div className="flex gap-3">
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
              className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 disabled:bg-green-400 transition"
            >
              {loading ? "Registrando..." : `Cobrar ${formatCurrency(saldo)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FilaReparacion({
  reparacion,
  clientes,
  tiposDisponibles,
  onUpdate,
  onEditarTipos,
  onPago,
  cajaAbierta,
  userRol,
  onCancelar,
  onImprimir,
}) {
  const [expandido, setExpandido] = useState(false);
  const cliente = clientes.find((c) => c.id === reparacion.cliente_id);
  const estadoInfo = ESTADOS_REP[reparacion.estado] || {
    label: reparacion.estado,
    color: "bg-gray-100 text-gray-700",
  };

  const FLUJO_ESTADOS = {
    en_diagnostico: null,
    ingresada: "en_reparacion",
    en_reparacion: "lista",
    lista: userRol === "tecnico" ? null : "entregada",
    entregada: null,
  };

  const siguienteEstado = FLUJO_ESTADOS[reparacion.estado];

  return (
    <>
      <tr className="hover:bg-gray-50 transition">
        <td className="px-6 py-4">
          <span className="font-medium text-blue-600">
            {reparacion.numero_orden}
          </span>
          <p className="text-xs text-gray-400">
            {formatDateTime(reparacion.fecha_ingreso)}
          </p>
        </td>
        <td className="px-6 py-4 text-sm text-gray-700">
          {cliente ? `${cliente.nombre} ${cliente.apellido || ""}` : "-"}
          {cliente?.telefono && (
            <p className="text-xs text-gray-400">{cliente.telefono}</p>
          )}
        </td>
        <td className="px-6 py-4 text-sm text-gray-700">
          <p className="font-medium">
            {reparacion.equipo?.marca} {reparacion.equipo?.modelo}
          </p>
          {reparacion.equipo?.imei && (
            <p className="text-xs text-gray-400">
              IMEI: {reparacion.equipo.imei}
            </p>
          )}
        </td>
        <td className="px-6 py-4">
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium ${estadoInfo.color}`}
          >
            {estadoInfo.label}
          </span>
        </td>
        <td className="px-6 py-4 text-sm">
          {reparacion.tipos_reparacion?.length > 0 ? (
            <div>
              {reparacion.tipos_reparacion.map((t, i) => (
                <p key={i} className="text-xs text-gray-600">
                  {t.nombre}
                </p>
              ))}
              <p className="font-semibold text-gray-800 mt-1">
                {formatCurrency(reparacion.precio_total || 0)}
              </p>
            </div>
          ) : (
            <span className="text-gray-400 text-xs">En diagnóstico</span>
          )}
        </td>
        <td className="px-6 py-4 text-sm">
          {reparacion.saldo_pendiente > 0 ? (
            <span className="text-red-600 font-medium">
              {formatCurrency(reparacion.saldo_pendiente)}
            </span>
          ) : reparacion.precio_total > 0 ? (
            <span className="text-green-600 text-xs font-medium">✓ Pagado</span>
          ) : (
            "-"
          )}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1 flex-wrap">
            {reparacion.estado === "en_diagnostico" && (
              <button
                onClick={() => onEditarTipos(reparacion)}
                className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition"
              >
                Definir
              </button>
            )}
            {siguienteEstado && (
              <button
                onClick={() =>
                  onUpdate(reparacion.id, { estado: siguienteEstado })
                }
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
              >
                → {ESTADOS_REP[siguienteEstado]?.label}
              </button>
            )}
            {reparacion.precio_total > 0 &&
              reparacion.saldo_pendiente > 0 &&
              cajaAbierta && (
                <button
                  onClick={() => onPago(reparacion)}
                  className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
                >
                  Cobrar
                </button>
              )}
            {reparacion.precio_total > 0 &&
              reparacion.saldo_pendiente > 0 &&
              !cajaAbierta &&
              userRol !== "tecnico" && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
                  Caja cerrada
                </span>
              )}
            {reparacion.estado !== "entregada" &&
              reparacion.estado !== "cancelada" && (
                <button
                  onClick={() => onCancelar(reparacion.id)}
                  className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                >
                  Cancelar
                </button>
              )}
            <button
              onClick={() => setExpandido(!expandido)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </td>
      </tr>

      {expandido && (
        <tr>
          <td colSpan={7} className="px-6 pb-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-white rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700">
                  Detalle del equipo
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <span>
                    Marca: <strong>{reparacion.equipo?.marca}</strong>
                  </span>
                  <span>
                    Modelo: <strong>{reparacion.equipo?.modelo}</strong>
                  </span>
                  <span>
                    IMEI: <strong>{reparacion.equipo?.imei || "-"}</strong>
                  </span>
                  <span>
                    Garantía: <strong>{reparacion.garantia_dias} días</strong>
                  </span>
                </div>
                {reparacion.equipo?.problema_descripcion && (
                  <p className="text-xs text-gray-600">
                    <strong>Problema:</strong>{" "}
                    {reparacion.equipo.problema_descripcion}
                  </p>
                )}
                {reparacion.notas_internas && (
                  <p className="text-xs text-gray-500 italic">
                    Notas: {reparacion.notas_internas}
                  </p>
                )}
                {reparacion.fecha_entrega && (
                  <p className="text-xs text-gray-500">
                    Entregado: {formatDateTime(reparacion.fecha_entrega)}
                  </p>
                )}
                {reparacion.fecha_vencimiento_garantia && (
                  <p className="text-xs text-green-600">
                    Garantía hasta:{" "}
                    {formatDateTime(reparacion.fecha_vencimiento_garantia)}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {reparacion.tipos_reparacion?.length > 0 && (
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Reparaciones
                    </p>
                    {reparacion.tipos_reparacion.map((t, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs text-gray-600 py-1 border-b border-gray-50"
                      >
                        <span>{t.nombre}</span>
                        <span className="font-medium">
                          {formatCurrency(t.precio)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold mt-2">
                      <span>Total</span>
                      <span>{formatCurrency(reparacion.precio_total)}</span>
                    </div>
                  </div>
                )}

                {reparacion.pagos?.length > 0 && (
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Pagos
                    </p>
                    {reparacion.pagos.map((p, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs text-gray-600 py-1"
                      >
                        <span>
                          {p.tipo} — {p.metodo} — {formatDateTime(p.fecha)}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(p.monto)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold border-t border-gray-100 pt-1 mt-1">
                      <span>Total pagado</span>
                      <span className="text-green-600">
                        {formatCurrency(reparacion.total_pagado)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => onImprimir(reparacion)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs hover:bg-gray-800 transition"
              >
                🖨️ Imprimir orden
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function CardReparacionMobile({
  reparacion,
  clientes,
  tiposDisponibles,
  onUpdate,
  onEditarTipos,
  onPago,
  cajaAbierta,
  userRol,
  onCancelar,
  onImprimir,
}) {
  const [expandido, setExpandido] = useState(false);
  const cliente = clientes.find((c) => c.id === reparacion.cliente_id);
  const estadoInfo = ESTADOS_REP[reparacion.estado] || {
    label: reparacion.estado,
    color: "bg-gray-100 text-gray-700",
  };

  const FLUJO_ESTADOS = {
    en_diagnostico: null,
    ingresada: "en_reparacion",
    en_reparacion: "lista",
    lista: userRol === "tecnico" ? null : "entregada",
    entregada: null,
  };

  const siguienteEstado = FLUJO_ESTADOS[reparacion.estado];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-blue-600">
            {reparacion.numero_orden}
          </span>
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium ${estadoInfo.color}`}
          >
            {estadoInfo.label}
          </span>
        </div>

        <div className="space-y-1 text-sm text-gray-600 mb-3">
          <p className="font-medium text-gray-800">
            {cliente ? `${cliente.nombre} ${cliente.apellido || ""}` : "-"}
          </p>
          {cliente?.telefono && (
            <p className="text-xs text-gray-400">{cliente.telefono}</p>
          )}
          <p className="text-gray-700">
            {reparacion.equipo?.marca} {reparacion.equipo?.modelo}
          </p>
          {reparacion.equipo?.imei && (
            <p className="text-xs text-gray-400">
              IMEI: {reparacion.equipo.imei}
            </p>
          )}
        </div>

        {reparacion.tipos_reparacion?.length > 0 && (
          <div className="mb-3">
            {reparacion.tipos_reparacion.map((t, i) => (
              <span
                key={i}
                className="inline-block text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-lg mr-1 mb-1"
              >
                {t.nombre}
              </span>
            ))}
            <p className="text-sm font-bold text-gray-800 mt-1">
              {formatCurrency(reparacion.precio_total || 0)}
            </p>
          </div>
        )}

        {reparacion.saldo_pendiente > 0 && (
          <p className="text-sm text-red-600 font-medium mb-3">
            Saldo: {formatCurrency(reparacion.saldo_pendiente)}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {reparacion.estado === "en_diagnostico" && (
            <button
              onClick={() => onEditarTipos(reparacion)}
              className="px-3 py-1.5 text-xs bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition"
            >
              Definir reparación
            </button>
          )}
          {siguienteEstado && (
            <button
              onClick={() =>
                onUpdate(reparacion.id, { estado: siguienteEstado })
              }
              className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
            >
              → {ESTADOS_REP[siguienteEstado]?.label}
            </button>
          )}

          {reparacion.precio_total > 0 &&
            reparacion.saldo_pendiente > 0 &&
            cajaAbierta && (
              <button
                onClick={() => onPago(reparacion)}
                className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
              >
                Cobrar
              </button>
            )}
          {reparacion.precio_total > 0 &&
            reparacion.saldo_pendiente > 0 &&
            !cajaAbierta &&
            userRol !== "tecnico" && (
              <span className="px-3 py-1.5 text-xs bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
                Caja cerrada
              </span>
            )}
          <button
            onClick={() => setExpandido(!expandido)}
            className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
          >
            {expandido ? "Ocultar" : "Ver más"}
          </button>
          {reparacion.estado !== "entregada" &&
            reparacion.estado !== "cancelada" && (
              <button
                onClick={() => onCancelar(reparacion.id)}
                className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
              >
                Cancelar
              </button>
            )}
        </div>
      </div>

      {expandido && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          <div className="space-y-1 text-xs text-gray-600">
            {reparacion.equipo?.problema_descripcion && (
              <p>
                <strong>Problema:</strong>{" "}
                {reparacion.equipo.problema_descripcion}
              </p>
            )}
            {reparacion.notas_internas && (
              <p className="italic text-gray-500">
                Notas: {reparacion.notas_internas}
              </p>
            )}
            <p>
              <strong>Ingresado:</strong>{" "}
              {formatDateTime(reparacion.fecha_ingreso)}
            </p>
            {reparacion.fecha_entrega && (
              <p>
                <strong>Entregado:</strong>{" "}
                {formatDateTime(reparacion.fecha_entrega)}
              </p>
            )}
            {reparacion.fecha_vencimiento_garantia && (
              <p className="text-green-600">
                <strong>Garantía hasta:</strong>{" "}
                {formatDateTime(reparacion.fecha_vencimiento_garantia)}
              </p>
            )}
          </div>

          {reparacion.pagos?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Pagos</p>
              {reparacion.pagos.map((p, i) => (
                <div
                  key={i}
                  className="flex justify-between text-xs text-gray-600"
                >
                  <span>
                    {p.tipo} — {p.metodo}
                  </span>
                  <span className="font-medium">{formatCurrency(p.monto)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs font-bold border-t border-gray-200 pt-1 mt-1">
                <span>Total pagado</span>
                <span className="text-green-600">
                  {formatCurrency(reparacion.total_pagado)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onImprimir(reparacion)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs hover:bg-gray-800 transition"
        >
          🖨️ Imprimir orden
        </button>
      </div>
    </div>
  );
}

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

function GestionTiposReparacion() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const filtered = tipos.filter((t) => {
    if (busqueda && !t.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      return false;
    if (filtroEstado === "activo" && !t.activo) return false;
    if (filtroEstado === "inactivo" && t.activo) return false;
    return true;
  });

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
        `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} este tipo?`,
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
          Nuevo Tipo
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
            placeholder="Buscar tipo de reparación..."
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
      ) : tipos.length === 0 ? (
        <div className="text-center py-12">
          <Wrench size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No hay tipos registrados</p>
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
                {filtered.map((tipo) => (
                  <tr key={tipo.id} className="hover:bg-gray-50 transition">
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
            {filtered.map((tipo) => (
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

export default function Reparaciones() {
  const [tab, setTab] = useState("reparaciones");
  const [reparaciones, setReparaciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tiposDisponibles, setTiposDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditarTipos, setShowEditarTipos] = useState(null);
  const [showPago, setShowPago] = useState(null);
  const [showFiltros, setShowFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    busqueda: "",
    estado: "",
    cliente_id: "",
  });
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const { user } = useAuth();
  const [showOrden, setShowOrden] = useState(null);

  const fetchData = async () => {
    try {
      const [reps, clients, tipos] = await Promise.all([
        reparacionesService.getAll(),
        clientesService.getAll(),
        tiposReparacionService.getAll(),
      ]);
      setReparaciones(reps);
      setClientes(clients);
      setTiposDisponibles(tipos);

      // Solo verificar caja si el rol lo permite
      if (user?.rol !== "tecnico" && user?.rol !== "deposito") {
        try {
          const cajaActual = await cajaService.getActual();
          setCajaAbierta(cajaActual?.estado === "abierta");
        } catch {
          setCajaAbierta(false);
        }
      }
    } catch (error) {
      toast.error("Error al cargar reparaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdate = async (id, data) => {
    try {
      await reparacionesService.update(id, data);
      toast.success("Estado actualizado");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al actualizar");
    }
  };

  const filtered = reparaciones.filter((r) => {
    if (
      filtros.busqueda &&
      !r.numero_orden?.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
      !`${r.equipo?.marca} ${r.equipo?.modelo}`
        .toLowerCase()
        .includes(filtros.busqueda.toLowerCase())
    )
      return false;
    if (filtros.estado && r.estado !== filtros.estado) return false;
    if (filtros.cliente_id && r.cliente_id !== filtros.cliente_id) return false;
    return true;
  });

  const limpiarFiltros = () =>
    setFiltros({ busqueda: "", estado: "", cliente_id: "" });
  const filtrosActivos = Object.values(filtros).some((v) => v !== "");

  const handleCancelar = async (id) => {
    if (!confirm("¿Cancelar esta orden de reparación?")) return;
    try {
      await reparacionesService.cancelar(id);
      toast.success("Reparación cancelada");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al cancelar");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Reparaciones</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("reparaciones")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "reparaciones"
              ? "bg-white shadow text-gray-800"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Reparaciones
        </button>
        <button
          onClick={() => setTab("tipos")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "tipos"
              ? "bg-white shadow text-gray-800"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Tipos de Reparación
        </button>
      </div>

      {tab === "tipos" ? (
        <GestionTiposReparacion />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              {reparaciones.length} órdenes registradas
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus size={18} />
              Nueva Orden
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Buscar por número u equipo..."
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
                Filtros
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
              <div className="bg-white border border-gray-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    {Object.entries(ESTADOS_REP).map(([v, { label }]) => (
                      <option key={v} value={v}>
                        {label}
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
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Wrench size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No se encontraron reparaciones</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Orden
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Cliente
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Equipo
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Reparaciones
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Saldo
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((r) => (
                      <FilaReparacion
                        key={r.id}
                        reparacion={r}
                        clientes={clientes}
                        tiposDisponibles={tiposDisponibles}
                        onUpdate={handleUpdate}
                        onEditarTipos={(r) => setShowEditarTipos(r)}
                        onPago={(r) => setShowPago(r)}
                        cajaAbierta={cajaAbierta}
                        userRol={user?.rol}
                        onCancelar={handleCancelar}
                        onImprimir={(r) => setShowOrden(r)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {filtered.map((r) => (
                  <CardReparacionMobile
                    key={r.id}
                    reparacion={r}
                    clientes={clientes}
                    tiposDisponibles={tiposDisponibles}
                    onUpdate={handleUpdate}
                    onEditarTipos={(r) => setShowEditarTipos(r)}
                    onPago={(r) => setShowPago(r)}
                    cajaAbierta={cajaAbierta}
                    userRol={user?.rol}
                    onCancelar={handleCancelar}
                    onImprimir={(r) => setShowOrden(r)}
                  />
                ))}
              </div>
            </>
          )}

          {showModal && (
            <NuevaReparacionModal
              onClose={() => setShowModal(false)}
              onSave={() => {
                setShowModal(false);
                fetchData();
              }}
            />
          )}
          {showEditarTipos && (
            <EditarTiposModal
              reparacion={showEditarTipos}
              tiposDisponibles={tiposDisponibles}
              onClose={() => setShowEditarTipos(null)}
              onSave={() => {
                setShowEditarTipos(null);
                fetchData();
              }}
            />
          )}
          {showPago && (
            <PagoModal
              reparacion={showPago}
              onClose={() => setShowPago(null)}
              onSave={() => {
                setShowPago(null);
                fetchData();
              }}
            />
          )}
        </div>
      )}
      {showOrden && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Orden de Reparación
              </h2>
              <button
                onClick={() => setShowOrden(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <OrdenReparacion
              reparacion={showOrden}
              cliente={clientes.find((c) => c.id === showOrden.cliente_id)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
