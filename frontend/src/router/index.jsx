// src/router/index.jsx
import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  Outlet,
} from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";

import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import ProductsPage from "../pages/products/ProductsPage";
import SuppliersPage from "../pages/suppliers/SuppliersPage";
import LocationsPage from "../pages/locations/LocationsPage";
import PurchaseOrdersPage from "../pages/purchaseOrders/PurchaseOrdersPage";
import SalesOrdersPage from "../pages/salesOrders/SalesOrdersPage";
import TransfersPage from "../pages/transfers/TransfersPage";
import CategoriesPage from "../pages/categories/CategoriesPage";
import ReportsPage from "../pages/reports/ReportsPage";
import NotFoundPage from "../pages/NotFoundPage";

import { useAuth } from "../hooks/useAuth";

// Require user to be logged in
const RequireAuth = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

// Require user role to be in allowed list
const RequireRole = ({ allowed }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowed.includes(user.role)) {
    // redirect back to dashboard if role is not allowed
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export const AppRouter = () => {
  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        }
      />

      {/* Protected routes */}
      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          {/* Default when entering / */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Master data + reports: ADMIN / MANAGER only */}
          <Route element={<RequireRole allowed={["ADMIN", "MANAGER"]} />}>
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          {/* Flows: all roles (ADMIN / MANAGER / CLERK) */}
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/sales-orders" element={<SalesOrdersPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;
