import React, { createContext, useContext, useEffect, useState } from "react";
import { authLogin, authSignup, authMe, getToken, setToken, clearToken } from "@/lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = checking, false = anon, object = authed
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (!t) { setUser(false); setLoading(false); return; }
    authMe()
      .then((u) => setUser(u))
      .catch(() => { clearToken(); setUser(false); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await authLogin(email, password);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (email, password, name) => {
    const data = await authSignup(email, password, name);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearToken();
    setUser(false);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const formatApiErrorDetail = (detail) => {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
};
