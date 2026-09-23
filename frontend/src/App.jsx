import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Categorias from "./pages/Categorias";
import NotFound from "./pages/NotFound";
import Productos from "./pages/Productos";
import Proveedores from "./pages/Proveedores";
import Stock from "./pages/Stock";
import Compras from "./pages/Compras";
import Ventas from "./pages/Ventas";
import Caja from "./pages/Caja";
import Reparaciones from "./pages/Reparaciones";
import TiposReparacion from "./pages/TiposReparacion";
import Usuarios from "./pages/Usuarios";
import Reportes from "./pages/Reportes";
import Auditoria from "./pages/Auditoria";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  return user ? children : <Navigate to="/login" />;
}

function PrivateLayout({ children }) {
  return (
    <PrivateRoute>
      <Layout>{children}</Layout>
    </PrivateRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route
        path="/dashboard"
        element={
          <PrivateLayout>
            <Dashboard />
          </PrivateLayout>
        }
      />
      <Route
        path="/clientes"
        element={
          <PrivateLayout>
            <Clientes />
          </PrivateLayout>
        }
      />
      <Route
        path="/categorias"
        element={
          <PrivateLayout>
            <Categorias />
          </PrivateLayout>
        }
      />
      <Route
        path="/productos"
        element={
          <PrivateLayout>
            <Productos />
          </PrivateLayout>
        }
      />
      <Route
        path="/proveedores"
        element={
          <PrivateLayout>
            <Proveedores />
          </PrivateLayout>
        }
      />
      <Route
        path="/stock"
        element={
          <PrivateLayout>
            <Stock />
          </PrivateLayout>
        }
      />
      <Route
        path="/compras"
        element={
          <PrivateLayout>
            <Compras />
          </PrivateLayout>
        }
      />
      <Route
        path="/ventas"
        element={
          <PrivateLayout>
            <Ventas />
          </PrivateLayout>
        }
      />
      <Route
        path="/caja"
        element={
          <PrivateLayout>
            <Caja />
          </PrivateLayout>
        }
      />
      <Route
        path="/reparaciones"
        element={
          <PrivateLayout>
            <Reparaciones />
          </PrivateLayout>
        }
      />
      <Route
        path="/tipos-reparacion"
        element={
          <PrivateLayout>
            <TiposReparacion />
          </PrivateLayout>
        }
      />
      <Route
        path="/usuarios"
        element={
          <PrivateLayout>
            <Usuarios />
          </PrivateLayout>
        }
      />
      <Route
        path="/reportes"
        element={
          <PrivateLayout>
            <Reportes />
          </PrivateLayout>
        }
      />
      <Route
        path="/auditoria"
        element={
          <PrivateLayout>
            <Auditoria />
          </PrivateLayout>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
