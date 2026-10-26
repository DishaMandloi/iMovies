import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, getToken, setToken } from '../services/api.js';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    async function loadUser() {
      const savedToken = getToken();
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await apiRequest<{ success: boolean; user: AuthUser }>('/api/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          setToken(null);
          setTokenState(null);
        }
      } catch (err) {
        console.warn('Session check failed, clearing token');
        setToken(null);
        setTokenState(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<{ success: boolean; token: string; user: AuthUser }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );

    if (res.success) {
      setToken(res.token);
      setTokenState(res.token);
      setUser(res.user);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await apiRequest<{ success: boolean; token: string; user: AuthUser }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }
    );

    if (res.success) {
      setToken(res.token);
      setTokenState(res.token);
      setUser(res.user);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore network errors on logout
    }
    setToken(null);
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAdmin: user?.role === 'admin',
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
