// src/layouts/AuthLayout.jsx
import React from "react";

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1 className="auth-title">SIPMS Login</h1>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
