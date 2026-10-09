import { useState, useEffect } from "react";
import {
  DollarSign,
  Plus,
  Minus,
  X,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Search,
} from "lucide-react";
import { cajaService } from "../services/caja.service";
import toast from "react-hot-toast";
import Paginacion from "../components/ui/Paginacion";
import ThOrdenable from "../components/ui/ThOrdenable";
import { useTabla } from "../hooks/useTabla";
import { useAuth } from "../context/AuthContext";
import {
  formatCurrency,
  formatDateTime,
  parsearMoneda,
} from "../utils/helpers";

function AbrirCajaModal({ onClose, onSave }) {
  const { user } = useAuth();
  const [monto, setMonto] = useState("");
  const [sucursal, setSucursal] = useState(
    user?.sucursales?.[0] || "sucursal_1",
  );
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);

  const [montoDisplay, setMontoDisplay] = useState("");
  const [esperado, setEsperado] = useState(null); // efectivo que dejó el cierre anterior

  // Al elegir la sucursal se busca lo que quedó en la caja la última vez
  useEffect(() => {
    let vigente = true;
    cajaService
      .getEsperado(sucursal)
      .then((d) => {
        if (!vigente) return;
        setEsperado(d?.esperado ?? null);
        // Se propone el monto esperado; se puede corregir si el conteo real es otro
        if (d?.esperado != null) {
          setMontoDisplay(
            new Intl.NumberFormat("es-AR", {
              maximumFractionDigits: 2,
            }).format(d.esperado),
          );
        } else {
          setMontoDisplay("");
        }
      })
      .catch(() => vigente && setEsperado(null));
    return () => {
      vigente = false;
    };
  }, [sucursal]);

  const montoContado = parsearMoneda(montoDisplay) || 0;
  const difApertura = esperado != null ? montoContado - esperado : 0;

  const handleMontoChange = (valor) => {
    // Permitir solo números y coma
    const limpio = valor.replace(/[^\d,]/g, "");

    // Separar parte entera y decimal por coma
    const partes = limpio.split(",");
    const entera = partes[0];
    const decimal = partes.length > 1 ? partes[1].slice(0, 2) : null;

    // Formatear parte entera con puntos de miles
    const enteraFormateada = entera
      ? new Intl.NumberFormat("es-AR").format(parseInt(entera) || 0)
      : "";

    setMontoDisplay(
      decimal !== null ? `${enteraFormateada},${decimal}` : enteraFormateada,
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await cajaService.abrir({
        monto_inicial: parsearMoneda(montoDisplay),
        sucursal,
        notas,
      });
      toast.success("Caja abierta correctamente");
      onSave();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al abrir la caja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Abrir Caja</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sucursal *
            </label>
            <select
              value={sucursal}
              onChange={(e) => setSucursal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(user?.sucursales || ["sucursal_1"]).map((s) => (
                <option key={s} value={s}>
                  {s === "sucursal_1" ? "Sucursal 1" : "Sucursal 2"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto inicial *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={montoDisplay}
                onChange={(e) => handleMontoChange(e.target.value)}
                placeholder="0,00"
                className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {esperado != null && (
              <p className="text-xs text-gray-500 mt-1">
                Según el cierre anterior quedaron{" "}
                <span className="font-medium">{formatCurrency(esperado)}</span>{" "}
                en caja.
              </p>
            )}
          </div>
          {esperado != null && Math.abs(difApertura) > 0.01 && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                difApertura > 0
                  ? "bg-blue-50 text-blue-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              <p className="font-medium">
                {difApertura > 0 ? "Sobran" : "Faltan"}{" "}
                {formatCurrency(Math.abs(difApertura))} respecto de lo esperado
              </p>
              <p className="text-xs opacity-80">
                La diferencia queda registrada en los detalles de esta caja.
                Si querés, aclará el motivo en las notas.
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
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
              className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 disabled:bg-green-400 transition"
            >
              {loading ? "Abriendo..." : "Abrir Caja"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CerrarCajaModal({ caja, onClose, onSave }) {
  const METODOS = [
    { key: "efectivo", label: "Efectivo" },
    { key: "transferencia", label: "Transferencia" },
    { key: "debito", label: "Débito" },
    { key: "credito", label: "Crédito" },
  ];

  const [montos, setMontos] = useState(
    METODOS.map((m) => ({ metodo: m.key, monto: "", display: "" })),
  );
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [dejar, setDejar] = useState({ monto: 0, display: "" });

  const totalMovimientos = (caja.movimientos || []).reduce(
    (acc, m) => (m.tipo === "ingreso" ? acc + m.monto : acc - m.monto),
    0,
  );
  const montoEsperadoTotal =
    caja.monto_inicial + (caja.total_ventas_hoy || 0) + totalMovimientos;

  // Calcular esperado por método basado en ventas y movimientos
  const esperadoPorMetodo = () => {
    const result = {
      efectivo: caja.monto_inicial,
      transferencia: 0,
      debito: 0,
      credito: 0,
    };

    // Sumar ventas por método
    if (caja.movimientos_completos) {
      caja.movimientos_completos.forEach((m) => {
        if (m.concepto === "venta" || m.concepto === "reparacion") {
          const metodo = m.metodo_pago?.toLowerCase();
          if (metodo && result.hasOwnProperty(metodo)) {
            result[metodo] = (result[metodo] || 0) + m.monto;
          }
        } else if (
          m.concepto === "manual" ||
          m.concepto === "devolucion_reparacion" ||
          m.concepto === "cancelacion_venta"
        ) {
          const metodo = m.metodo_pago?.toLowerCase();
          if (metodo && result.hasOwnProperty(metodo)) {
            result[metodo] =
              (result[metodo] || 0) +
              (m.tipo === "ingreso" ? m.monto : -m.monto);
          }
        }
      });
    }
    return result;
  };

  const esperado = esperadoPorMetodo();

  const handleMontoChange = (index, valor) => {
    const limpio = valor.replace(/[^\d,]/g, "");
    const partes = limpio.split(",");
    const entera = partes[0];
    const decimal = partes.length > 1 ? partes[1].slice(0, 2) : null;
    const enteraFormateada = entera
      ? new Intl.NumberFormat("es-AR").format(parseInt(entera) || 0)
      : "";
    const display =
      decimal !== null ? `${enteraFormateada},${decimal}` : enteraFormateada;
    const monto = parsearMoneda(display);

    const newMontos = [...montos];
    newMontos[index] = { ...newMontos[index], monto, display };
    setMontos(newMontos);
  };

  const totalReal = montos.reduce((acc, m) => acc + (m.monto || 0), 0);
  const efectivoContado = montos.find((m) => m.metodo === "efectivo")?.monto || 0;
  const excedeDejar = dejar.monto > efectivoContado + 0.001;

  const handleDejarChange = (valor) => {
    const limpio = valor.replace(/[^\d,]/g, "");
    const partes = limpio.split(",");
    const entera = partes[0];
    const decimal = partes.length > 1 ? partes[1].slice(0, 2) : null;
    const enteraFormateada = entera
      ? new Intl.NumberFormat("es-AR").format(parseInt(entera) || 0)
      : "";
    const display =
      decimal !== null ? `${enteraFormateada},${decimal}` : enteraFormateada;
    setDejar({ monto: parsearMoneda(display) || 0, display });
  };

  const dejarTodo = () =>
    setDejar({
      monto: efectivoContado,
      display: new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 2,
      }).format(efectivoContado),
    });

  const diferenciaPorMetodo = METODOS.map((m) => {
    const montoIngresado = montos.find((mo) => mo.metodo === m.key)?.monto || 0;
    const montoEsperado = esperado[m.key] || 0;
    return {
      metodo: m.key,
      label: m.label,
      esperado: montoEsperado,
      real: montoIngresado,
      diferencia: montoIngresado - montoEsperado,
    };
  }).filter((d) => d.esperado > 0 || d.real > 0);

  const hayDiferencias = diferenciaPorMetodo.some(
    (d) => Math.abs(d.diferencia) > 0.01,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (excedeDejar) {
      toast.error("No podés dejar en caja más efectivo del que contaste");
      return;
    }
    setLoading(true);
    try {
      const result = await cajaService.cerrar({
        montos_por_metodo: montos.map((m) => ({
          metodo: m.metodo,
          monto: m.monto || 0,
        })),
        dejar_en_caja: dejar.monto || 0,
        notas,
      });
      toast.success("Caja cerrada correctamente");
      onSave(result);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al cerrar la caja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Cerrar Caja</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Resumen del día */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Resumen del día
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Monto inicial</span>
              <span className="font-medium">
                {formatCurrency(caja.monto_inicial)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total ventas</span>
              <span className="font-medium text-green-600">
                + {formatCurrency(caja.total_ventas_hoy || 0)}
              </span>
            </div>
            {totalMovimientos !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Movimientos manuales</span>
                <span
                  className={`font-medium ${totalMovimientos >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {totalMovimientos >= 0 ? "+" : ""}
                  {formatCurrency(totalMovimientos)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
              <span className="text-gray-700">Total esperado</span>
              <span>{formatCurrency(montoEsperadoTotal)}</span>
            </div>
            {caja.monto_esperado_apertura != null &&
              Math.abs(caja.diferencia_apertura || 0) > 0.01 && (
                <p
                  className={`text-xs pt-1 ${
                    caja.diferencia_apertura > 0 ? "text-blue-600" : "text-red-600"
                  }`}
                >
                  Al abrir esta caja se esperaban{" "}
                  {formatCurrency(caja.monto_esperado_apertura)} y se contaron{" "}
                  {formatCurrency(caja.monto_inicial)} (
                  {caja.diferencia_apertura > 0 ? "sobraban " : "faltaban "}
                  {formatCurrency(Math.abs(caja.diferencia_apertura))}).
                </p>
              )}
          </div>

          {/* Ingreso por método */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Ingresá el monto contado por método
            </p>
            {METODOS.map((m, index) => (
              <div key={m.key} className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                  <p className="text-sm text-gray-600">{m.label}</p>
                  <p className="text-xs text-gray-400">
                    Esp: {formatCurrency(esperado[m.key] || 0)}
                  </p>
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={montos[index].display}
                    onChange={(e) => handleMontoChange(index, e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {montos[index].monto > 0 && (
                  <div
                    className={`text-xs font-medium w-20 text-right ${
                      Math.abs(montos[index].monto - (esperado[m.key] || 0)) <
                      0.01
                        ? "text-green-600"
                        : montos[index].monto > (esperado[m.key] || 0)
                          ? "text-blue-600"
                          : "text-red-600"
                    }`}
                  >
                    {montos[index].monto === (esperado[m.key] || 0)
                      ? "✓ OK"
                      : montos[index].monto > (esperado[m.key] || 0)
                        ? `+${formatCurrency(montos[index].monto - (esperado[m.key] || 0))}`
                        : `-${formatCurrency((esperado[m.key] || 0) - montos[index].monto)}`}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Efectivo que queda en la caja para mañana */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                Dejar en caja (efectivo)
              </p>
              <button
                type="button"
                onClick={dejarTodo}
                disabled={efectivoContado <= 0}
                className="text-xs text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline"
              >
                Dejar todo el efectivo contado
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={dejar.display}
                onChange={(e) => handleDejarChange(e.target.value)}
                placeholder="0"
                className={`w-full pl-7 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                  excedeDejar
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              />
            </div>
            {excedeDejar ? (
              <p className="text-xs text-red-600">
                Es más que el efectivo contado ({formatCurrency(efectivoContado)}).
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Se retira {formatCurrency(Math.max(0, efectivoContado - (dejar.monto || 0)))}.
                Lo que dejes será el monto inicial esperado de la próxima apertura.
              </p>
            )}
          </div>

          {/* Resumen totales */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total contado</span>
              <span className="font-semibold">{formatCurrency(totalReal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total esperado</span>
              <span className="font-semibold">
                {formatCurrency(montoEsperadoTotal)}
              </span>
            </div>
            <div
              className={`flex justify-between text-sm font-bold border-t border-gray-200 pt-2 ${
                Math.abs(totalReal - montoEsperadoTotal) < 0.01
                  ? "text-green-700"
                  : totalReal > montoEsperadoTotal
                    ? "text-blue-700"
                    : "text-red-700"
              }`}
            >
              <span>Diferencia total</span>
              <span>
                {totalReal >= montoEsperadoTotal ? "+" : ""}
                {formatCurrency(totalReal - montoEsperadoTotal)}
              </span>
            </div>
          </div>

          {/* Diferencias por método */}
          {hayDiferencias && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Diferencias por método
              </p>
              {diferenciaPorMetodo.map(
                (d) =>
                  Math.abs(d.diferencia) > 0.01 && (
                    <div
                      key={d.metodo}
                      className={`flex items-center justify-between px-4 py-2 rounded-xl text-sm ${
                        d.diferencia > 0
                          ? "bg-blue-50 text-blue-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      <span className="font-medium">{d.label}</span>
                      <div className="text-right">
                        <p className="text-xs opacity-75">
                          Esp: {formatCurrency(d.esperado)} / Real:{" "}
                          {formatCurrency(d.real)}
                        </p>
                        <p className="font-bold">
                          {d.diferencia > 0 ? "Sobran" : "Faltan"}{" "}
                          {formatCurrency(Math.abs(d.diferencia))}
                        </p>
                      </div>
                    </div>
                  ),
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

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
              className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 disabled:bg-red-400 transition"
            >
              {loading ? "Cerrando..." : "Cerrar Caja"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MovimientoModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    tipo: "ingreso",
    monto: "",
    motivo: "",
    metodo_pago: "efectivo",
    notas: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await cajaService.abrir({
        monto_inicial: parsearMoneda(montoDisplay),
        sucursal,
        notas,
      });
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
            Nuevo Movimiento
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, tipo: "ingreso" })}
              className={`py-2 rounded-xl text-sm font-medium transition ${
                form.tipo === "ingreso"
                  ? "bg-green-600 text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              + Ingreso
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, tipo: "egreso" })}
              className={`py-2 rounded-xl text-sm font-medium transition ${
                form.tipo === "egreso"
                  ? "bg-red-600 text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              - Egreso
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto *
            </label>
            <input
              type="number"
              required
              min="0"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              placeholder="$ 0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de pago *
            </label>
            <select
              value={form.metodo_pago}
              onChange={(e) =>
                setForm({ ...form, metodo_pago: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo *
            </label>
            <input
              type="text"
              required
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              placeholder="ej: Pago de servicios, retiro de efectivo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
function ResumenCierre({ resultado, onClose }) {
  const diferencia = resultado.diferencia || 0;
  const metodosLabel = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    debito: "Débito",
    credito: "Crédito",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Resumen de Cierre
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total ventas del día</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(resultado.total_ventas)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Monto esperado total</span>
              <span className="font-semibold">
                {formatCurrency(resultado.monto_esperado)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Monto real contado</span>
              <span className="font-semibold">
                {formatCurrency(resultado.monto_real)}
              </span>
            </div>
            <div
              className={`flex justify-between font-bold p-3 rounded-xl text-sm ${
                diferencia === 0
                  ? "bg-green-50 text-green-700"
                  : diferencia > 0
                    ? "bg-blue-50 text-blue-700"
                    : "bg-red-50 text-red-700"
              }`}
            >
              <span>Diferencia total</span>
              <span>
                {diferencia >= 0 ? "+" : ""}
                {formatCurrency(diferencia)}
              </span>
            </div>
          </div>

          {/* Efectivo que queda y efectivo que se retira */}
          {resultado.monto_dejado !== undefined && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Efectivo dejado en caja</span>
                <span className="font-semibold">
                  {formatCurrency(resultado.monto_dejado || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Efectivo retirado</span>
                <span className="font-semibold">
                  {formatCurrency(resultado.monto_retirado || 0)}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Lo dejado será el monto inicial esperado de la próxima apertura.
              </p>
            </div>
          )}

          {/* Diferencia que hubo al abrir esta caja */}
          {resultado.monto_esperado_apertura != null &&
            Math.abs(resultado.diferencia_apertura || 0) > 0.01 && (
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  resultado.diferencia_apertura > 0
                    ? "bg-blue-50 text-blue-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                <p className="font-medium">Diferencia al abrir esta caja</p>
                <p className="text-xs opacity-80">
                  Se esperaban {formatCurrency(resultado.monto_esperado_apertura)}{" "}
                  y se abrió con {formatCurrency(resultado.monto_inicial)}:{" "}
                  {resultado.diferencia_apertura > 0 ? "sobraron" : "faltaron"}{" "}
                  {formatCurrency(Math.abs(resultado.diferencia_apertura))}.
                </p>
              </div>
            )}

          {/* Detalle por método */}
          {resultado.esperado_por_metodo && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Detalle por método de pago
              </p>
              <div className="space-y-2">
                {Object.entries(resultado.esperado_por_metodo).map(
                  ([metodo, esperado]) => {
                    const real =
                      resultado.montos_reales_por_metodo?.[metodo] || 0;
                    const diff =
                      resultado.diferencias_por_metodo?.[metodo] || 0;
                    return (
                      <div
                        key={metodo}
                        className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {metodosLabel[metodo] || metodo}
                        </span>
                        <div className="text-right space-y-0.5">
                          <p className="text-xs text-gray-500">
                            Esperado: {formatCurrency(esperado)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Real: {formatCurrency(real)}
                          </p>
                          <p
                            className={`text-xs font-bold ${
                              diff === 0
                                ? "text-green-600"
                                : diff > 0
                                  ? "text-blue-600"
                                  : "text-red-600"
                            }`}
                          >
                            {diff >= 0 ? "+" : ""}
                            {formatCurrency(diff)}
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm hover:bg-gray-900 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Caja() {
  const [caja, setCaja] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("actual");
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [resumenCierre, setResumenCierre] = useState(null);
  const [expandedCaja, setExpandedCaja] = useState(null);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");

  const fetchData = async () => {
    try {
      const [actual, hist] = await Promise.all([
        cajaService.getActual(),
        cajaService.getHistorial(),
      ]);
      setCaja(actual);
      setHistorial(hist);
    } catch (error) {
      toast.error("Error al cargar caja");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const cajaAbierta = caja?.estado === "abierta";

  const totalMovimientos = cajaAbierta
    ? (caja.movimientos || []).reduce(
        (acc, m) => (m.tipo === "ingreso" ? acc + m.monto : acc - m.monto),
        0,
      )
    : 0;

  const totalVentasHoy = caja?.total_ventas_hoy || 0;
  const saldoActual = cajaAbierta
    ? caja.monto_inicial + totalVentasHoy + totalMovimientos
    : 0;

  const historialFiltrado = historial
    .filter((c) => c.estado === "cerrada")
    .filter((c) => {
      if (!busquedaHistorial) return true;
      const fecha = c.fecha_apertura ? formatDateTime(c.fecha_apertura) : "";
      return fecha.toLowerCase().includes(busquedaHistorial.toLowerCase());
    });

  const tablaMov = useTabla(caja?.movimientos_completos || [], {
    porPagina: 15,
    ordenInicial: { campo: "fecha", dir: "desc" },
    accessors: {
      fecha: (m) => (m.fecha ? new Date(m.fecha).getTime() : null),
      monto: (m) => (m.tipo === "ingreso" ? m.monto : -m.monto),
    },
  });

  const tablaHist = useTabla(historialFiltrado, { porPagina: 10 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Caja</h1>
          <p className="text-gray-500 text-sm mt-1">
            {cajaAbierta ? "Caja abierta" : "Caja cerrada"}
          </p>
        </div>
        <div className="flex gap-2">
          {cajaAbierta ? (
            <>
              <button
                onClick={() => setShowMovimientoModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
              >
                <Plus size={18} />
                Movimiento
              </button>
              <button
                onClick={() => setShowCerrarModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-medium"
              >
                <Lock size={18} />
                Cerrar Caja
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAbrirModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm font-medium"
            >
              <Unlock size={18} />
              Abrir Caja
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("actual")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "actual"
              ? "bg-white shadow text-gray-800"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Caja Actual
        </button>
        <button
          onClick={() => setTab("historial")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "historial"
              ? "bg-white shadow text-gray-800"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Historial
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : tab === "actual" ? (
        <div className="space-y-4">
          {!cajaAbierta ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Lock size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No hay caja abierta</p>
              <p className="text-gray-400 text-sm mt-1">
                Abrí la caja para comenzar a registrar ventas
              </p>
              <button
                onClick={() => setShowAbrirModal(true)}
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 transition"
              >
                Abrir Caja Ahora
              </button>
            </div>
          ) : (
            <>
              {/* Cards resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Monto inicial</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {formatCurrency(caja.monto_inicial)}
                  </p>
                  {caja.monto_esperado_apertura != null &&
                    (Math.abs(caja.diferencia_apertura || 0) > 0.01 ? (
                      <p
                        className={`text-xs mt-1 font-medium ${
                          caja.diferencia_apertura > 0
                            ? "text-blue-600"
                            : "text-red-600"
                        }`}
                      >
                        Se esperaban {formatCurrency(caja.monto_esperado_apertura)} ·{" "}
                        {caja.diferencia_apertura > 0 ? "sobran" : "faltan"}{" "}
                        {formatCurrency(Math.abs(caja.diferencia_apertura))}
                      </p>
                    ) : (
                      <p className="text-xs mt-1 text-green-600">
                        ✓ Coincide con lo dejado en el cierre anterior
                      </p>
                    ))}
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Ventas del día</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(totalVentasHoy)}
                  </p>
                </div>
                <div className="bg-blue-600 rounded-2xl p-6 shadow-sm">
                  <p className="text-sm text-blue-100">Saldo estimado</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(saldoActual)}
                  </p>
                </div>
              </div>

              {/* Movimientos completos */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">
                    Movimientos del día
                  </h3>
                </div>
                {!caja.movimientos_completos ||
                caja.movimientos_completos.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No hay movimientos registrados
                  </div>
                ) : (
                  <>
                    {/* Desktop */}
                    <div className="hidden md:block">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <ThOrdenable campo="concepto" tabla={tablaMov} className="px-6 py-3">Concepto</ThOrdenable>
                            <ThOrdenable campo="descripcion" tabla={tablaMov} className="px-6 py-3">Descripción</ThOrdenable>
                            <ThOrdenable campo="metodo_pago" tabla={tablaMov} className="px-6 py-3">Método</ThOrdenable>
                            <ThOrdenable campo="monto" tabla={tablaMov} className="px-6 py-3">Monto</ThOrdenable>
                            <ThOrdenable campo="fecha" tabla={tablaMov} className="px-6 py-3">Fecha</ThOrdenable>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {tablaMov.filas.map((m, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-[background-color]">
                              <td className="px-6 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                                    m.concepto === "venta"
                                      ? "bg-blue-100 text-blue-700"
                                      : m.concepto === "reparacion"
                                        ? "bg-purple-100 text-purple-700"
                                        : m.tipo === "ingreso"
                                          ? "bg-green-100 text-green-700"
                                          : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {m.concepto === "venta"
                                    ? "Venta"
                                    : m.concepto === "reparacion"
                                      ? "Reparación"
                                      : m.concepto === "devolucion_reparacion" ||
                                        m.concepto === "cancelacion_venta"
                                        ? m.concepto === "cancelacion_venta"
                                          ? "Cancelación"
                                          : "Devolución"
                                        : m.tipo === "ingreso"
                                          ? "Ingreso"
                                          : "Egreso"}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-700">
                                {m.descripcion}
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-600">
                                {m.metodo_pago || "-"}
                              </td>
                              <td
                                className={`px-6 py-3 text-sm font-semibold ${
                                  m.tipo === "ingreso"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {m.tipo === "ingreso" ? "+" : "-"}
                                {formatCurrency(m.monto)}
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-500">
                                {m.fecha ? formatDateTime(m.fecha) : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {tablaMov.filas.map((m, i) => (
                        <div
                          key={i}
                          className="p-4 flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${
                                  m.concepto === "venta"
                                    ? "bg-blue-100 text-blue-700"
                                    : m.concepto === "reparacion"
                                      ? "bg-purple-100 text-purple-700"
                                      : m.tipo === "ingreso"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                }`}
                              >
                                {m.concepto === "venta"
                                  ? "Venta"
                                  : m.concepto === "reparacion"
                                    ? "Reparación"
                                    : m.concepto === "devolucion_reparacion" ||
                                      m.concepto === "cancelacion_venta"
                                      ? m.concepto === "cancelacion_venta"
                                        ? "Cancelación"
                                        : "Devolución"
                                      : m.tipo === "ingreso"
                                        ? "Ingreso"
                                        : "Egreso"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">
                              {m.descripcion}
                            </p>
                            <p className="text-xs text-gray-400">
                              {m.fecha ? formatDateTime(m.fecha) : "-"}
                            </p>
                          </div>
                          <span
                            className={`text-sm font-bold ${
                              m.tipo === "ingreso"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {m.tipo === "ingreso" ? "+" : "-"}
                            {formatCurrency(m.monto)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Paginacion
                      total={tablaMov.total}
                      porPagina={tablaMov.porPagina}
                      paginaActual={tablaMov.pagina}
                      onChange={tablaMov.setPagina}
                      compacto
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        // Historial
        <div className="space-y-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por fecha..."
              value={busquedaHistorial}
              onChange={(e) => setBusquedaHistorial(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {historial.filter((c) => c.estado === "cerrada").length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No hay cajas cerradas en el historial
            </div>
          ) : (
            tablaHist.filas.map((c, idx) => {
              const i = (tablaHist.pagina - 1) * tablaHist.porPagina + idx;
              return (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedCaja(expandedCaja === i ? null : i)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-800">
                        {c.fecha_apertura
                          ? formatDateTime(c.fecha_apertura)
                          : "-"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Cerrada:{" "}
                        {c.fecha_cierre ? formatDateTime(c.fecha_cierre) : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Ventas</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(c.total_ventas || 0)}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Diferencia</p>
                      <p
                        className={`font-semibold ${
                          (c.diferencia || 0) === 0
                            ? "text-gray-600"
                            : (c.diferencia || 0) > 0
                              ? "text-blue-600"
                              : "text-red-600"
                        }`}
                      >
                        {(c.diferencia || 0) >= 0 ? "+" : ""}
                        {formatCurrency(c.diferencia || 0)}
                      </p>
                    </div>
                    {expandedCaja === i ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedCaja === i && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Monto inicial</p>
                        <p className="font-semibold text-gray-800">
                          {formatCurrency(c.monto_inicial)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Total ventas</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(c.total_ventas || 0)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Monto esperado</p>
                        <p className="font-semibold text-gray-800">
                          {formatCurrency(c.monto_final_esperado || 0)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Monto real</p>
                        <p className="font-semibold text-gray-800">
                          {formatCurrency(c.monto_final_real || 0)}
                        </p>
                      </div>
                    </div>

                    {(c.monto_dejado != null ||
                      c.monto_esperado_apertura != null) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {c.monto_esperado_apertura != null && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500">
                              Esperado al abrir
                            </p>
                            <p className="font-semibold text-gray-800">
                              {formatCurrency(c.monto_esperado_apertura)}
                            </p>
                          </div>
                        )}
                        {c.monto_esperado_apertura != null && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500">
                              Diferencia al abrir
                            </p>
                            <p
                              className={`font-semibold ${
                                Math.abs(c.diferencia_apertura || 0) < 0.01
                                  ? "text-green-600"
                                  : c.diferencia_apertura > 0
                                    ? "text-blue-600"
                                    : "text-red-600"
                              }`}
                            >
                              {Math.abs(c.diferencia_apertura || 0) < 0.01
                                ? "Sin diferencia"
                                : `${c.diferencia_apertura > 0 ? "+" : "-"}${formatCurrency(Math.abs(c.diferencia_apertura))}`}
                            </p>
                          </div>
                        )}
                        {c.monto_dejado != null && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500">
                              Dejado en caja
                            </p>
                            <p className="font-semibold text-gray-800">
                              {formatCurrency(c.monto_dejado)}
                            </p>
                          </div>
                        )}
                        {c.monto_retirado != null && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500">
                              Efectivo retirado
                            </p>
                            <p className="font-semibold text-gray-800">
                              {formatCurrency(c.monto_retirado)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {c.movimientos?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Movimientos
                        </p>
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-3 py-2 text-xs text-gray-500">
                                Tipo
                              </th>
                              <th className="text-left px-3 py-2 text-xs text-gray-500">
                                Motivo
                              </th>
                              <th className="text-left px-3 py-2 text-xs text-gray-500">
                                Monto
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {c.movimientos.map((m, j) => (
                              <tr key={j}>
                                <td className="px-3 py-2">
                                  <span
                                    className={`text-xs font-medium ${m.tipo === "ingreso" ? "text-green-600" : "text-red-600"}`}
                                  >
                                    {m.tipo === "ingreso"
                                      ? "Ingreso"
                                      : "Egreso"}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {m.motivo}
                                </td>
                                <td
                                  className={`px-3 py-2 font-medium ${m.tipo === "ingreso" ? "text-green-600" : "text-red-600"}`}
                                >
                                  {m.tipo === "ingreso" ? "+" : "-"}
                                  {formatCurrency(m.monto)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })
          )}
          <Paginacion
            total={tablaHist.total}
            porPagina={tablaHist.porPagina}
            paginaActual={tablaHist.pagina}
            onChange={tablaHist.setPagina}
          />
        </div>
      )}

      {showAbrirModal && (
        <AbrirCajaModal
          onClose={() => setShowAbrirModal(false)}
          onSave={() => {
            setShowAbrirModal(false);
            fetchData();
          }}
        />
      )}
      {showCerrarModal && (
        <CerrarCajaModal
          caja={caja}
          onClose={() => setShowCerrarModal(false)}
          onSave={(result) => {
            setShowCerrarModal(false);
            setResumenCierre(result);
            fetchData();
          }}
        />
      )}
      {showMovimientoModal && (
        <MovimientoModal
          onClose={() => setShowMovimientoModal(false)}
          onSave={() => {
            setShowMovimientoModal(false);
            fetchData();
          }}
        />
      )}
      {resumenCierre && (
        <ResumenCierre
          resultado={resumenCierre}
          onClose={() => setResumenCierre(null)}
        />
      )}
    </div>
  );
}
