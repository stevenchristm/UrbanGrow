import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, adminAPI } from '../services/api';
import wsService from '../services/websocket';

interface User {
  id_user: number;
  nama: string;
  email: string;
  role: string;
  logo_path: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (nama: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        wsService.connect(parsedUser.id_user);
      }
    } catch (e) {
      console.log('Error loading auth:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      let response;
      if (email.toLowerCase() === 'admin@urban.com') {
        response = await adminAPI.login({ email, password });
      } else {
        response = await authAPI.login({ email, password });
      }
      
      const { token: newToken, user: userData } = response.data;

      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);

      // Connect WebSocket if not admin, or just connect anyway
      if (userData.role !== 'admin') {
        wsService.connect(userData.id_user);
      }

      return { success: true, role: userData.role };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login gagal. Periksa koneksi Anda.',
      };
    }
  };

  const register = async (nama: string, email: string, password: string) => {
    try {
      await authAPI.register({ nama, email, password });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registrasi gagal.',
      };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
    wsService.disconnect();
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    AsyncStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
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
