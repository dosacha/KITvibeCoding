import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api.js';

const STORAGE_KEY = 'unitflow-auth';
const AuthContext = createContext(null);

function readStoredAuth() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { token: '', user: null };
  try {
    const parsed = JSON.parse(raw);
    return { token: parsed?.token || '', user: parsed?.user || null };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { token: '', user: null };
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return readStoredAuth().token;
  });
  const [user, setUser] = useState(() => {
    return readStoredAuth().user;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [token, user]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const payload = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setToken(payload.access_token);
      setUser(payload.user);
      return payload.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) return null;
    const me = await apiRequest('/auth/me', { token });
    setUser(me);
    return me;
  }, [token]);

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, login, logout, refreshMe, isAuthenticated: Boolean(token) }),
    [token, user, loading, login, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('AuthContext가 초기화되지 않았습니다.');
  }
  return context;
}
