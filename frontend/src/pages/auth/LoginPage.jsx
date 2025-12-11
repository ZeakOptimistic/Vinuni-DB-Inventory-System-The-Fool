// src/pages/auth/LoginPage.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

const LoginPage = () => {
  const { login, isLoading, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ username, password });
      const from =
        (location.state && location.state.from && location.state.from.pathname) ||
        "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label className="form-label">
        Username
        <input
          className="form-input"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
      </label>

      <label className="form-label">
        Password
        <input
          className="form-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      {error && <div className="form-error">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
};

export default LoginPage;
