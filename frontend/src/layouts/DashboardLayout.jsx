// src/layouts/DashboardLayout.jsx
import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const TOKEN_KEY = "sipms_token";
const USER_KEY = "sipms_user";
const BACKUP_TOKEN_KEY = "sipms_admin_token_backup";
const BACKUP_USER_KEY = "sipms_admin_user_backup";

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const role = user?.role;

  const canManageMasterData = role === "ADMIN" || role === "MANAGER";
  const canViewReports = role === "ADMIN" || role === "MANAGER";
  const canManageUsers = user?.role === "ADMIN";

  const hasAdminBackup = Boolean(localStorage.getItem(BACKUP_TOKEN_KEY));

  const backToAdmin = () => {
    const backupToken = localStorage.getItem(BACKUP_TOKEN_KEY) || "";
    const backupUser = localStorage.getItem(BACKUP_USER_KEY) || "";

    if (!backupToken || !backupUser) return;

    localStorage.setItem(TOKEN_KEY, backupToken);
    localStorage.setItem(USER_KEY, backupUser);

    localStorage.removeItem(BACKUP_TOKEN_KEY);
    localStorage.removeItem(BACKUP_USER_KEY);

    window.location.href = "/dashboard";
  };

  const logoutAll = () => {
    // Logout should also clear backup to avoid "getting stuck"
    localStorage.removeItem(BACKUP_TOKEN_KEY);
    localStorage.removeItem(BACKUP_USER_KEY);
    logout();
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">SIPMS</div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className="sidebar-link">
            Dashboard
          </NavLink>

          {/* Master data: only ADMIN / MANAGER */}
          {canManageMasterData && (
            <>
              <NavLink to="/products" className="sidebar-link">
                Products
              </NavLink>
              <NavLink to="/suppliers" className="sidebar-link">
                Suppliers
              </NavLink>
              <NavLink to="/locations" className="sidebar-link">
                Locations
              </NavLink>
              <NavLink to="/categories" className="sidebar-link">
                Categories
              </NavLink>
            </>
          )}

          {/* Flows: visible to all signed-in users */}
          <NavLink to="/purchase-orders" className="sidebar-link">
            Purchase Orders
          </NavLink>
          <NavLink to="/sales-orders" className="sidebar-link">
            Sales Orders
          </NavLink>
          <NavLink to="/transfers" className="sidebar-link">
            Transfers
          </NavLink>

          {/* Reports: only ADMIN / MANAGER */}
          {canViewReports && (
            <NavLink to="/reports" className="sidebar-link">
              Reports
            </NavLink>
          )}

          {/* Manage Users: only ADMIN */}
          {canManageUsers && (
            <NavLink to="/users" className="sidebar-link">
              Users
            </NavLink>
          )}

        </nav>
      </aside>

      <div className="main-area">
        <header className="main-header">
          <div />
          <div className="header-right">
            <span className="header-user">
              {user?.full_name || user?.username} ({user?.role})
            </span>
            {hasAdminBackup && (
              <button className="btn btn-outline" onClick={backToAdmin}>
                Back to Admin
              </button>
            )}

            <button className="btn btn-outline" onClick={logoutAll}>
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
