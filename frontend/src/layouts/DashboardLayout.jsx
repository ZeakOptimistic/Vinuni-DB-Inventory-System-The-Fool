// src/layouts/DashboardLayout.jsx
import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const DashboardLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">SIPMS</div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className="sidebar-link">
            Dashboard
          </NavLink>
          <NavLink to="/products" className="sidebar-link">
            Products
          </NavLink>
          <NavLink to="/categories" className="sidebar-link">
            Categories
          </NavLink>
          <NavLink to="/suppliers" className="sidebar-link">
            Suppliers
          </NavLink>
          <NavLink to="/locations" className="sidebar-link">
            Locations
          </NavLink>
          <NavLink to="/purchase-orders" className="sidebar-link">
            Purchase Orders
          </NavLink>
          <NavLink to="/sales-orders" className="sidebar-link">
            Sales Orders
          </NavLink>
          <NavLink to="/transfers" className="sidebar-link">
            Transfers
          </NavLink>
          <NavLink to="/reports" className="sidebar-link">
            Reports
          </NavLink>
        </nav>
      </aside>

      <div className="main-area">
        <header className="main-header">
          <div />
          <div className="header-right">
            <span className="header-user">
              {user?.full_name || user?.username} ({user?.role})
            </span>
            <button className="btn btn-outline" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
