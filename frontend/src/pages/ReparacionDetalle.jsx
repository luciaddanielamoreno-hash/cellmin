import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Printer, X } from "lucide-react";
import toast from "react-hot-toast";
import { reparacionesService } from "../services/reparaciones.service";
import { clientesService } from "../services/clientes.service";
import DetalleReparacion from "../components/ui/DetalleReparacion";
import OrdenReparacion from "../components/ui/OrdenReparacion";

export default function ReparacionDetalle() {
  const { id } = useParams();
  const [reparacion, setReparacion] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOrden, setShowOrden] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const r = await reparacionesService.getById(id);
        setReparacion(r);
        if (r.cliente_id) {
          const clientes = await clientesService.getAll();
          setCliente(clientes.find((c) => c.id === r.cliente_id) || null);
        }
      } catch (error) {
        toast.error("No se pudo cargar la orden");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Cargando...</div>;
  }

  if (!reparacion) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-gray-500">Orden no encontrada</p>
        <Link to="/reparaciones" className="text-sm text-blue-600 hover:underline">
          Volver a Reparaciones
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/reparaciones"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft size={16} />
            Volver a Reparaciones
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">
            Orden {reparacion.numero_orden}
          </h1>
        </div>
        <button
          onClick={() => setShowOrden(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition text-sm font-medium"
        >
          <Printer size={16} />
          Imprimir orden
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <DetalleReparacion reparacion={reparacion} cliente={cliente} />
      </div>

      {showOrden && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Orden de Reparación
              </h2>
              <button
                onClick={() => setShowOrden(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <OrdenReparacion reparacion={reparacion} cliente={cliente} />
          </div>
        </div>
      )}
    </div>
  );
}
