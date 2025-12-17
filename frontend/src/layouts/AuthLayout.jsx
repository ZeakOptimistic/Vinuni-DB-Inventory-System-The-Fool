// src/layouts/AuthLayout.jsx
import React from "react";

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-layout auth-layout--moon">
      <div className="auth-card auth-card--moon">
        <h1 className="auth-title">Login</h1>
        {children}
      </div>
    </div>

  );
};

export default AuthLayout;
