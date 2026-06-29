'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, saveToken, clearToken } from '@/lib/api-client';

const AuthCtx = createContext({ user: null, loading: true, login: async () => {}, logout: () => {}, register: async () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('procurio_token')) {
        const res = await api.me();
        setUser(res.data.user);
      }
    } catch { clearToken(); setUser(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    saveToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };
  const register = async (data) => {
    const res = await api.register(data);
    saveToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };
  const logout = () => { clearToken(); setUser(null); };

  return <AuthCtx.Provider value={{ user, loading, login, logout, register }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
