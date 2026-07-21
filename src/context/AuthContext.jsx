// src/context/AuthContext.jsx
// ─────────────────────────────────────────────────────────
// Session + admin identity context. Wraps the whole app (in
// App.jsx, outside the router) so any component can check
// `useAuth()` for the current session and admin role.
// ─────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { admin as adminApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshAdminUser = async () => {
    const current = await adminApi.getCurrentAdmin();
    setAdminUser(current);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        refreshAdminUser().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        refreshAdminUser();
      } else {
        setAdminUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAdminUser(null);
  };

  return (
    <AuthContext.Provider value={{
      session,
      adminUser,
      loading,
      isAuthenticated: !!session,
      signIn,
      signUp,
      signOut,
      refreshAdminUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be used within an <AuthProvider>");
  return ctx;
}
