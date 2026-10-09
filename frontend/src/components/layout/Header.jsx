import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, User, DollarSign } from "lucide-react";
import { useCotizacion } from "../../hooks/useCotizacion";
import { formatCurrency } from "../../utils/helpers";
import toast from "react-hot-toast";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cotizacion = useCotizacion();

  const handleLogout = () => {
    logout();
    toast.success("Sesión cerrada");
    navigate("/login");
  };

  const roleLabels = {
    administrador: "Administrador",
    cajero: "Cajero",
    vendedor: "Vendedor",
    deposito: "Depósito",
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-sm hidden md:block">
          Sistema de Gestión — Cellmin
        </span>
      </div>
      <div className="flex items-center gap-3">
        {cotizacion.cargado && !cotizacion.disponible && (
          <div
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500"
            title="No se pudo obtener la cotización del dólar. Los precios en USD no se muestran."
          >
            <DollarSign size={13} />
            <span>Dólar no disponible</span>
          </div>
        )}
        {cotizacion.disponible && (
          <div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
              cotizacion.obsoleta
                ? "bg-yellow-50 text-yellow-700"
                : "bg-green-50 text-green-700"
            }`}
            title={
              cotizacion.obsoleta
                ? "No se pudo actualizar: se usa el último valor conocido"
                : "Dólar blue (venta)"
            }
          >
            <DollarSign size={13} />
            <span>Blue {formatCurrency(cotizacion.venta)}</span>
            {cotizacion.obsoleta && <span className="hidden sm:inline">· desactualizado</span>}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-800">{user?.nombre}</p>
            <p className="text-xs text-gray-500">{roleLabels[user?.rol]}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut size={16} />
          <span className="hidden md:block">Salir</span>
        </button>
      </div>
    </header>
  );
}
