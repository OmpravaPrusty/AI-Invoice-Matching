import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import PurchaseOrders from "./pages/PurchaseOrders";
import UploadPO from "./pages/UploadPO";
import PODetails from "./pages/PODetails";
import ComparisonWizard from "./pages/ComparisonWizard";
import "./App.css";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();

  return user?.role === "admin" ? (
    children
  ) : (
    <Navigate to="/dashboard" replace />
  );
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <PurchaseOrders />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders/upload"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <UploadPO />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders/:id"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <PODetails />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/comparisons"
        element={
          <ProtectedRoute>
            <ComparisonWizard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
