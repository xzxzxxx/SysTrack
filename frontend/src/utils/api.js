import axios from 'axios';

// Create a new Axios instance with a base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
});

// --- Request Interceptor ---
// This runs BEFORE each request is sent.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Add the Authorization header to every authenticated request
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Response Interceptor ---
// This runs AFTER each response is received.
api.interceptors.response.use(
  (response) => {
    // Check for our custom token refresh header
    const newToken = response.headers['x-refreshed-token'];
    if (newToken) {
      console.log('Token refreshed successfully');
      // Silently update the token in localStorage
      localStorage.setItem('token', newToken);
      window.dispatchEvent(new Event('token-updated'));
    }
    return response;
  },
  (error) => {
    // If we get a 401 error, it means the token is invalid/expired
    // and the user should be logged out.
    if (error.response && error.response.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        // Only proceed with logout/redirect if NOT on login
        localStorage.removeItem('token');
        // Force a reload to the login page
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;