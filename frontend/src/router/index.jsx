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
import NotFoundPage from "../pages/NotFoundPage";
import ReportsPage from "../pages/reports/ReportsPage";

import { useAuth } from "../hooks/useAuth";

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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/sales-orders" element={<SalesOrdersPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
