// src/context/AuthContext.jsx
import React, { createContext, useEffect, useState } from "react";
import { authApi } from "../api/authApi";
import axios from "axios";

export const AuthContext = createContext(undefined);

const TOKEN_KEY = "sipms_token";
const USER_KEY = "sipms_user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);   // { id, username, full_name, role }
  const [token, setToken] = useState(null); // JWT string
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage when app starts
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user:", e);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (payload) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(payload);
      setToken(data.access);
      setUser(data.user);

      localStorage.setItem(TOKEN_KEY, data.access);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch (err) {
      let message = "Login failed. Please try again.";
      if (axios.isAxiosError(err)) {
        message =
          (err.response && err.response.data && err.response.data.detail) ||
          err.message ||
          message;
      }
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const value = { user, token, isLoading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
