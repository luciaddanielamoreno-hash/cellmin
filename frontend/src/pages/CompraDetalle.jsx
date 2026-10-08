import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { comprasService } from "../services/compras.service";
import { proveedoresService } from "../services/proveedores.service";
import DetalleCompra from "../components/ui/DetalleCompra";

export default function CompraDetalle() {
  const { id } = useParams();
  const [compra, setCompra] = useState(null);
  const [proveedor, setProveedor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const c = await comprasService.getById(id);
        setCompra(c);
        if (c.proveedor_id) {
          const proveedores = await proveedoresService.getAll();
          setProveedor(proveedores.find((p) => p.id === c.proveedor_id) || null);
        }
      } catch (error) {
        toast.error("No se pudo cargar la compra");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Cargando...</div>;
  }

  if (!compra) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-gray-500">Compra no encontrada</p>
        <Link to="/compras" className="text-sm text-blue-600 hover:underline">
          Volver a Compras
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/compras"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft size={16} />
          Volver a Compras
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">
          Compra {compra.numero_compra}
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <DetalleCompra compra={compra} proveedor={proveedor} />
      </div>
    </div>
  );
}
