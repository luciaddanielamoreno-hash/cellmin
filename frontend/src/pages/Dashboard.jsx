import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Wrench,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import api from "../services/api";
import { formatCurrency } from "../utils/helpers";
import { useAuth } from "../context/AuthContext";

function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}
        >
          <Icon size={22} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/reports/dashboard");
        setStats(response.data);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );

  const accesosRapidos = {
    administrador: [
      {
        label: "Nueva Venta",
        icon: ShoppingCart,
        color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
        path: "/ventas",
      },
      {
        label: "Nueva Reparación",
        icon: Wrench,
        color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
        path: "/reparaciones",
      },
      {
        label: "Ver Reportes",
        icon: TrendingUp,
        color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
        path: "/reportes",
      },
      {
        label: "Gestionar Stock",
        icon: Package,
        color: "bg-green-50 text-green-600 hover:bg-green-100",
        path: "/stock",
      },
    ],
    cajero: [
      {
        label: "Nueva Venta",
        icon: ShoppingCart,
        color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
        path: "/ventas",
      },
      {
        label: "Nueva Reparación",
        icon: Wrench,
        color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
        path: "/reparaciones",
      },
      {
        label: "Caja",
        icon: TrendingUp,
        color: "bg-green-50 text-green-600 hover:bg-green-100",
        path: "/caja",
      },
      {
        label: "Ver Clientes",
        icon: Users,
        color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
        path: "/clientes",
      },
    ],
    vendedor: [
      {
        label: "Nueva Venta",
        icon: ShoppingCart,
        color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
        path: "/ventas",
      },
      {
        label: "Nueva Reparación",
        icon: Wrench,
        color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
        path: "/reparaciones",
      },
      {
        label: "Ver Clientes",
        icon: Users,
        color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
        path: "/clientes",
      },
      {
        label: "Ver Stock",
        icon: Package,
        color: "bg-green-50 text-green-600 hover:bg-green-100",
        path: "/stock",
      },
    ],
    tecnico: [
      {
        label: "Ver Reparaciones",
        icon: Wrench,
        color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
        path: "/reparaciones",
      },
      {
        label: "Ver Clientes",
        icon: Users,
        color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
        path: "/clientes",
      },
    ],
    deposito: [
      {
        label: "Ver Stock",
        icon: Package,
        color: "bg-green-50 text-green-600 hover:bg-green-100",
        path: "/stock",
      },
      {
        label: "Nueva Compra",
        icon: ShoppingCart,
        color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
        path: "/compras",
      },
      {
        label: "Ver Productos",
        icon: Package,
        color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
        path: "/productos",
      },
    ],
  };

  const accesos = accesosRapidos[user?.rol] || accesosRapidos.administrador;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Bienvenido, {user?.nombre}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Cards métricas — solo para roles que tienen acceso */}
      {user?.rol !== "tecnico" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(user?.rol === "administrador" ||
            user?.rol === "cajero" ||
            user?.rol === "vendedor") && (
            <StatCard
              title="Ventas de hoy"
              value={stats?.ventas_hoy ?? 0}
              icon={ShoppingCart}
              color="bg-blue-500"
              subtitle={formatCurrency(stats?.total_ventas_hoy ?? 0)}
            />
          )}
          <StatCard
            title="Reparaciones activas"
            value={stats?.reparaciones_activas ?? 0}
            icon={Wrench}
            color="bg-orange-500"
            subtitle="En proceso"
          />
          {(user?.rol === "administrador" || user?.rol === "deposito") && (
            <StatCard
              title="Stock bajo"
              value={stats?.stock_bajo ?? 0}
              icon={AlertTriangle}
              color="bg-red-500"
              subtitle="Requieren reposición"
            />
          )}
          {user?.rol !== "deposito" && (
            <StatCard
              title="Total clientes"
              value={stats?.total_clientes ?? 0}
              icon={Users}
              color="bg-green-500"
              subtitle="Registrados"
            />
          )}
        </div>
      )}

      {/* Para técnico solo reparaciones activas */}
      {user?.rol === "tecnico" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Reparaciones activas"
            value={stats?.reparaciones_activas ?? 0}
            icon={Wrench}
            color="bg-orange-500"
            subtitle="En proceso"
          />
          <StatCard
            title="Total clientes"
            value={stats?.total_clientes ?? 0}
            icon={Users}
            color="bg-green-500"
            subtitle="Registrados"
          />
        </div>
      )}

      {/* Accesos rápidos */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {accesos.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`${item.color} rounded-xl p-4 flex flex-col items-center gap-2 transition`}
              >
                <Icon size={24} />
                <span className="text-sm font-medium text-center">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
