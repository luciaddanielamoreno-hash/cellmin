import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  BarChart2,
  Wrench,
  DollarSign,
  Menu,
  X,
  ArrowLeftRight,
} from "lucide-react";

const allMenuItems = [
  {
    path: "/dashboard",
    label: "Inicio",
    icon: LayoutDashboard,
    roles: ["administrador", "cajero", "vendedor", "deposito", "tecnico"],
  },
  {
    path: "/ventas",
    label: "Ventas",
    icon: ShoppingCart,
    roles: ["administrador", "cajero", "vendedor"],
  },
  {
    path: "/reparaciones",
    label: "Reparaciones",
    icon: Wrench,
    roles: ["administrador", "cajero", "vendedor", "tecnico"],
  },
  {
    path: "/productos",
    label: "Productos",
    icon: Package,
    roles: ["administrador", "deposito"],
  },
  {
    path: "/stock",
    label: "Stock",
    icon: ArrowLeftRight,
    roles: ["administrador", "deposito", "cajero", "vendedor"],
  },
  {
    path: "/compras",
    label: "Compras",
    icon: Truck,
    roles: ["administrador", "deposito"],
  },
  {
    path: "/clientes",
    label: "Clientes",
    icon: Users,
    roles: ["administrador", "cajero", "vendedor", "tecnico"],
  },
  {
    path: "/caja",
    label: "Caja",
    icon: DollarSign,
    roles: ["administrador", "cajero"],
  },
  {
    path: "/reportes",
    label: "Reportes",
    icon: BarChart2,
    roles: ["administrador"],
  },
  {
    path: "/usuarios",
    label: "Usuarios",
    icon: Users,
    roles: ["administrador"],
  },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = allMenuItems.filter((item) =>
    item.roles.includes(user?.rol),
  );

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sucursalLabel =
    user?.sucursales?.length > 1
      ? "Todas las sucursales"
      : user?.sucursales?.[0] === "sucursal_1"
        ? "Sucursal 1"
        : "Sucursal 2";

  // En desktop el sidebar colapsa a solo íconos, se expande al hover
  const expanded = hovered;

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          fixed md:static inset-y-0 left-0 z-40
          bg-gray-900 flex flex-col
          transition-all duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${expanded ? "md:w-64" : "md:w-16"}
          w-64
        `}
      >
        {/* Logo */}
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <button
            onClick={() => handleNavigate("/dashboard")}
            className="flex items-center gap-3 hover:opacity-80 transition"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
              <img
                src="/cellmin_logo.png"
                alt="Cellmin"
                className="w-full h-full object-cover"
              />
            </div>
            {(expanded || mobileOpen) && (
              <div>
                <h1 className="text-white font-bold text-lg leading-none">
                  Cellmin
                </h1>
                <p className="text-gray-400 text-xs">Sistema de Gestión</p>
              </div>
            )}
          </button>

          {/* Botón cerrar solo en mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 text-gray-400 hover:text-white rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Menú */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                title={!expanded ? item.label : ""}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                  ${!expanded && !mobileOpen ? "justify-center" : ""}
                  ${isActive ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}
                `}
              >
                <Icon size={18} className="shrink-0" />
                {(expanded || mobileOpen) && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {(expanded || mobileOpen) && (
          <div className="p-4 border-t border-gray-700 space-y-1">
            <p className="text-xs text-gray-500 text-center">{sucursalLabel}</p>
            <p className="text-xs text-gray-600 text-center capitalize">
              {user?.rol}
            </p>
          </div>
        )}
      </aside>

      {/* Botón hamburguesa mobile — izquierda con logo */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 text-white rounded-lg"
        >
          <Menu size={22} />
        </button>
        <button
          onClick={() => handleNavigate("/dashboard")}
          className="flex items-center gap-2 hover:opacity-80 transition"
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
            <img
              src="/cellmin_logo.png"
              alt="Cellmin"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-white font-bold text-base">Cellmin</span>
        </button>
      </div>
    </>
  );
}
