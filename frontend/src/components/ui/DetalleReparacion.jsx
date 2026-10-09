import PatronBloqueo from "./PatronBloqueo";
import {
  ESTADOS_REP,
  formatCurrency,
  formatDateTime,
  SUCURSALES,
} from "../../utils/helpers";

function Dato({ titulo, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
        {titulo}
      </p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

export default function DetalleReparacion({ reparacion, cliente }) {
  const estado = ESTADOS_REP[reparacion.estado] || {
    label: reparacion.estado,
    color: "bg-gray-100 text-gray-700",
  };
  const sucursal =
    SUCURSALES.find((s) => s.value === reparacion.sucursal)?.label ||
    reparacion.sucursal ||
    "-";
  const tipos = reparacion.tipos_reparacion || [];
  const pagos = reparacion.pagos || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Dato titulo="Ingreso">
          {reparacion.fecha_ingreso
            ? formatDateTime(reparacion.fecha_ingreso)
            : "-"}
        </Dato>
        <Dato titulo="Cliente">
          {cliente ? `${cliente.nombre} ${cliente.apellido || ""}` : "-"}
          {cliente?.telefono && (
            <p className="text-xs text-gray-400">{cliente.telefono}</p>
          )}
        </Dato>
        <Dato titulo="Sucursal">{sucursal}</Dato>
        <Dato titulo="Estado">
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium ${estado.color}`}
          >
            {estado.label}
          </span>
        </Dato>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Equipo</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
          <span>
            Marca: <strong>{reparacion.equipo?.marca || "-"}</strong>
          </span>
          <span>
            Modelo: <strong>{reparacion.equipo?.modelo || "-"}</strong>
          </span>
          <span>
            IMEI: <strong>{reparacion.equipo?.imei || "-"}</strong>
          </span>
          <span>
            Garantía: <strong>{reparacion.garantia_dias} días</strong>
          </span>
        </div>
        {reparacion.equipo?.problema_descripcion && (
          <p className="text-sm text-gray-600">
            <strong>Problema:</strong> {reparacion.equipo.problema_descripcion}
          </p>
        )}
        <div className="text-sm text-gray-600">
          <strong>Bloqueo de pantalla:</strong>{" "}
          {(!reparacion.equipo?.bloqueo_tipo ||
            reparacion.equipo.bloqueo_tipo === "ninguno") && "Sin bloqueo"}
          {reparacion.equipo?.bloqueo_tipo === "pin" && (
            <span>
              PIN <span className="font-mono">{reparacion.equipo.bloqueo_valor}</span>
            </span>
          )}
          {reparacion.equipo?.bloqueo_tipo === "password" && (
            <span>
              Contraseña{" "}
              <span className="font-mono">{reparacion.equipo.bloqueo_valor}</span>
            </span>
          )}
          {reparacion.equipo?.bloqueo_tipo === "patron" && (
            <div className="mt-2">
              <PatronBloqueo value={reparacion.equipo.bloqueo_valor} readOnly />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Reparaciones
          </p>
          {tipos.length === 0 ? (
            <p className="text-sm text-gray-400">
              Todavía en diagnóstico, sin reparaciones definidas
            </p>
          ) : (
            <>
              {tipos.map((t, i) => (
                <div
                  key={i}
                  className="flex justify-between text-sm text-gray-600 py-1 border-b border-gray-100"
                >
                  <span>{t.nombre}</span>
                  <span className="font-medium">{formatCurrency(t.precio)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-gray-800 mt-2">
                <span>Total</span>
                <span>{formatCurrency(reparacion.precio_total || 0)}</span>
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Pagos</p>
          {pagos.length === 0 ? (
            <p className="text-sm text-gray-400">Sin pagos registrados</p>
          ) : (
            pagos.map((p, i) => (
              <div
                key={i}
                className="flex justify-between text-sm text-gray-600 py-1 border-b border-gray-100"
              >
                <span className="capitalize">
                  {p.tipo} — {p.metodo} — {formatDateTime(p.fecha)}
                </span>
                <span className="font-medium">{formatCurrency(p.monto)}</span>
              </div>
            ))
          )}
          <div className="flex justify-between text-sm font-bold text-green-600 mt-2">
            <span>Total pagado</span>
            <span>{formatCurrency(reparacion.total_pagado || 0)}</span>
          </div>
          {reparacion.total_devuelto > 0 && (
            <div className="flex justify-between text-sm font-bold text-gray-600 mt-1">
              <span>Devuelto al cancelar</span>
              <span>{formatCurrency(reparacion.total_devuelto)}</span>
            </div>
          )}
          {reparacion.estado !== "cancelada" && reparacion.saldo_pendiente > 0 && (
            <div className="flex justify-between text-sm font-bold text-red-600 mt-1">
              <span>Saldo pendiente</span>
              <span>{formatCurrency(reparacion.saldo_pendiente)}</span>
            </div>
          )}
        </div>
      </div>

      {(reparacion.fecha_entrega ||
        reparacion.fecha_vencimiento_garantia ||
        reparacion.notas_internas) && (
        <div className="space-y-1 text-sm">
          {reparacion.fecha_entrega && (
            <p className="text-gray-600">
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
          {reparacion.notas_internas && (
            <p className="text-gray-500 italic">
              Notas: {reparacion.notas_internas}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
