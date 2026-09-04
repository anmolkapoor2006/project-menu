import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Prevent stale 304 or CDN edge caching on API requests
    if (config.method?.toLowerCase() === 'get') {
      config.params = { ...(config.params || {}), _t: Date.now() };
      if (config.headers) {
        config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        config.headers['Pragma'] = 'no-cache';
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/menu/')) {
      // Only clear and redirect if we're in the admin/dashboard portal, not customer menu
      if (window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/admin')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('restaurant');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
