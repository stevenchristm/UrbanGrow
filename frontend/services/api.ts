import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

const api = axios.create({
  baseURL: API_URL + '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth APIs
export const authAPI = {
  register: (data: { nama: string; email: string; password: string }) =>
    api.post('/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/login', data),
  getProfile: () => api.get('/profile'),
};

// Dashboard API
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
  simpanTanam: (data: { lahan: string; tanaman: string; tanggal: string }) =>
    api.post('/simpan-tanam', data),
  syncKatalogAi: () => api.post('/sync-katalog-ai'),
};

// Lahan (Space) APIs
export const lahanAPI = {
  getAll: () => api.get('/lahan'),
  get: (id: number) => api.get(`/lahan/${id}`),
  create: (data: any) => api.post('/lahan', data),
  update: (id: number, data: any) => api.put(`/lahan/${id}`, data),
  delete: (id: number, data: { password_konfirmasi: string }) =>
    api.delete(`/lahan/${id}`, { data }),
  getRekomendasi: (id: number) => api.get(`/lahan/rekomendasi/${id}`),
};

// Katalog APIs
export const katalogAPI = {
  getAll: () => api.get('/katalog'),
  create: (formData: FormData) =>
    api.post('/katalog', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, formData: FormData) =>
    api.put(`/katalog/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAiLifecycle: (id: number) => api.get(`/katalog/${id}/ai-lifecycle`),
};

// Jadwal APIs
export const jadwalAPI = {
  getAll: () => api.get('/semua-jadwal'),
  delete: (id: number) => api.delete(`/semua-jadwal/${id}`),
  completeTask: (id: number, step: number) =>
    api.post(`/complete-task/${id}`, { step }),
  getAttention: (id: number, hariKe: number, missedCount: number) =>
    api.get(`/semua-jadwal/${id}/attention?hari_ke=${hariKe}&missed_count=${missedCount}`),
  tandaiSelesai: (data: { penjadwalan_id: number; step: number }) =>
    api.post('/jadwal/selesai', data),
};

// User APIs
export const userAPI = {
  getAll: () => api.get('/user'),
  get: (id: number) => api.get(`/user/${id}`),
  update: (id: number, formData: FormData) =>
    api.put(`/user/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// AI Assistant APIs
export const aiAPI = {
  getHistory: () => api.get('/ai-assistant'),
  chat: (formData: FormData) =>
    api.post('/ai-ask', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  clear: () => api.post('/ai-clear'),
};

// Community Chat APIs
export const chatAPI = {
  getMessages: () => api.get('/chat/messages'),
  send: (message: string) => api.post('/chat/send', { message }),
  clear: () => api.delete('/chat/clear'),
};

// Admin APIs
export const adminAPI = {
  login: (data: { email: string; password: string }) =>
    api.post('/admin/login', data),
  getDashboard: () => api.get('/admin/dashboard'),
  updateSettings: (data: Record<string, string>) =>
    api.post('/admin/settings', data),
};
