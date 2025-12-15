import axios from 'axios';
import { AuthStorage } from '../features/auth/utils/authStorage';

const redirectToLogin = (reason: string) => {
  if (typeof globalThis === 'undefined') {
    return;
  }
  const redirectTarget = encodeURIComponent(globalThis.location.pathname + globalThis.location.search);
  globalThis.location.href = `/login?reason=${reason}&redirect=${redirectTarget}`;
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    "Accept": 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const session = AuthStorage.getSession();

    if (session?.token) {
      const scheme = session.tokenType || 'Bearer';
      config.headers.Authorization = `${scheme} ${session.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;

      switch (status) {
        case 401:
        case 403:
          AuthStorage.clearSession();
          
          redirectToLogin('expired'); 
          console.error("Error de autenticación/autorización. Redirigiendo a login.");
          break;

        case 500:
        case 502:
        case 503:
          console.error("Error interno del servidor.");
          break;
          
        default:
          console.error(`Error no manejado: ${status}`);
          break;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
