import axios from 'axios';
import { getAccessToken, refreshSessionToken, supabase } from '../context/AuthContext';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach access token and withCredentials
api.interceptors.request.use(
  (config) => {
    config.withCredentials = true;
    const token = getAccessToken();
    if (token && config.headers) {
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized errors and retry once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest) {
      // If we have already retried once, sign out and reject
      if (originalRequest._retry) {
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('[API Interceptor] Error signing out after failed retry:', signOutError);
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const newToken = await refreshSessionToken();
        if (newToken && originalRequest.headers) {
          if (typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
          } else {
            (originalRequest.headers as any).Authorization = `Bearer ${newToken}`;
          }
          return api(originalRequest);
        } else {
          await supabase.auth.signOut();
        }
      } catch (refreshError) {
        console.error('[API Interceptor] Error during silent token refresh:', refreshError);
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('[API Interceptor] Error signing out:', signOutError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

