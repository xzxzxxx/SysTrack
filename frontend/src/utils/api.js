import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// --- session-only "Expiring Soon months" helper ---
const readSessionExpiringMonths = () => {
  // Read an integer string from sessionStorage; return null if not set
  const raw = sessionStorage.getItem('expiringMonthsOverride');
  if (!raw) return null;
  const m = parseInt(raw, 10);
  return Number.isFinite(m) && m > 0 ? String(m) : null;
};

// Create a new Axios instance with a base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
});

// --- Token Refresh Queue Mechanism ---
let isRefreshing = false;
let refreshSubscribers = [];

// Function to notify all subscribers when refresh is done
function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

// --- Request Interceptor ---
// This runs BEFORE each request is sent.
api.interceptors.request.use(
  (config) => {
    // Keep existing token header
    const token = localStorage.getItem('token');
    if (token) {
      // Add the Authorization header to every authenticated request
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Add session-only expiring months header
    const m = readSessionExpiringMonths();
    if (m) {
      // Backend should read this to override "Expiring Soon" window
      config.headers['X-Expiring-Months'] = m;
    } else {
      // Ensure no stale header leaks when override is cleared
      if (config.headers && 'X-Expiring-Months' in config.headers) {
        delete config.headers['X-Expiring-Months'];
      }
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
    console.log('Received newToken:', newToken);
    if (newToken) {
      try {
        const decoded = jwtDecode(newToken);
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          console.error('Expired newToken received! Ignoring.');
          return response;
        }
      } catch (err) {
        console.error('Invalid newToken:', err);
        return response;
      }
      if (!isRefreshing) {
        // First one to refresh: update storage and notify
        isRefreshing = true;
        console.log('Token refreshed successfully');
        localStorage.setItem('token', newToken);
        window.dispatchEvent(new Event('token-updated'));
        onRefreshed(newToken);
        isRefreshing = false;
      } else {
        // Others wait in queue
        return new Promise((resolve) => {
          refreshSubscribers.push(() => {
            // Once refreshed, update their config with new token if needed
            if (response.config) {
              response.config.headers['Authorization'] = `Bearer ${newToken}`;
            }
            resolve(response);
          });
        });
      }
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

// Optional: listen to live updates (no-op; next request will read storage)
window.addEventListener('expiring-months-updated', () => { /* no-op */ });

export default api;