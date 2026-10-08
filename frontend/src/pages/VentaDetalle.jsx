import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Printer, X } from "lucide-react";
import toast from "react-hot-toast";
import { ventasService } from "../services/ventas.service";
import { clientesService } from "../services/clientes.service";
import DetalleVenta from "../components/ui/DetalleVenta";
import TicketVenta from "../components/ui/TicketVenta";

export default function VentaDetalle() {
  const { id } = useParams();
  const [venta, setVenta] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTicket, setShowTicket] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const v = await ventasService.getById(id);
        setVenta(v);
        if (v.cliente_id) {
          const clientes = await clientesService.getAll();
          setCliente(clientes.find((c) => c.id === v.cliente_id) || null);
        }
      } catch (error) {
        toast.error("No se pudo cargar la venta");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Cargando...</div>;
  }

  if (!venta) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-gray-500">Venta no encontrada</p>
        <Link to="/ventas" className="text-sm text-blue-600 hover:underline">
          Volver a Ventas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/ventas"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft size={16} />
            Volver a Ventas
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">
            Venta {venta.numero_venta}
          </h1>
        </div>
        <button
          onClick={() => setShowTicket(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition text-sm font-medium"
        >
          <Printer size={16} />
          Imprimir ticket
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <DetalleVenta venta={venta} cliente={cliente} />
      </div>

      {showTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Ticket de Venta
              </h2>
              <button
                onClick={() => setShowTicket(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <TicketVenta venta={venta} cliente={cliente} />
            <button
              onClick={() => setShowTicket(false)}
              className="mt-3 w-full py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
