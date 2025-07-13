import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

interface AuthContextType {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, token } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(true);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user } = response.data;
      setAuth(token, user);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (username: string, password: string, email?: string) => {
    try {
      const response = await api.post('/auth/register', { username, password, email });
      const { token, user } = response.data;
      setAuth(token, user);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = () => {
    clearAuth();
  };

  // Verify token on app start
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          await api.get('/auth/me');
        } catch (error) {
          clearAuth();
        }
      }
      setIsLoading(false);
    };

    verifyToken();
  }, [token, clearAuth]);

  return (
    <AuthContext.Provider value={{ login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}