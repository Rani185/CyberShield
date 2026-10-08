import axios from 'axios';

/**
 * Axios instance pre-configured to point at the CyberShield backend.
 * All API modules import this client instead of creating their own.
 */
const client = axios.create({
  // Empty baseURL = same origin → requests go through the Vite dev proxy
  // which forwards /api/* to the FastAPI backend. This avoids CORS entirely.
  baseURL: '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — normalise errors so callers always get a
// descriptive message rather than a raw Axios error object.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default client;
