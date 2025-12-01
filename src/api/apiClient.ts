// src/api/apiClient.ts
import axios from 'axios';
import { router } from '../main';

// 1. Creamos la instancia de Axios con la configuración base
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // URL base de tu API desde variables de entorno
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Interceptor para las peticiones (Requests)
apiClient.interceptors.request.use(
  (config) => {
    // Aquí puedes obtener el token de tu store de Zustand, localStorage, etc.
    // const token = useAuthStore.getState().token; 
    const token = localStorage.getItem('authToken');

    if (token) {
      // Si el token existe, lo añadimos a la cabecera de autorización
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Manejar errores en la configuración de la petición
    return Promise.reject(error);
  }
);

// 3. Interceptor para las respuestas (Responses)
apiClient.interceptors.response.use(
  (response) => {
    // Cualquier código de estado que se encuentre dentro del rango de 2xx causa que esta función se active
    // Aquí no hacemos nada, solo devolvemos la respuesta
    return response;
  },
  (error) => {
    // Cualquier código de estado que caiga fuera del rango de 2xx causa que esta función se active
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;

      // Manejamos los errores específicos
      switch (status) {
        case 401:
        case 403:
          // Error de autenticación o autorización
          // Limpiamos el estado de autenticación (ej. borramos el token)
          // useAuthStore.getState().logout();
          localStorage.removeItem('authToken');
          
          // Redirigimos al usuario a la página de login
          // Usamos el router de TanStack para una redirección limpia
          router.navigate({ to: '/' }); 
          console.error("Error de autenticación/autorización. Redirigiendo a login.");
          break;

        case 500:
        case 502:
        case 503:
          // Errores del servidor
          // Podríamos redirigir a una página de "Error del Servidor"
          router.navigate({ to: '/' });
          console.error("Error interno del servidor.");
          break;
          
        default:
          // Otros errores (ej. 404, 400)
          console.error(`Error no manejado: ${status}`);
          break;
      }
    }
    // Devolvemos el error para que pueda ser manejado por el .catch() de la llamada original
    return Promise.reject(error);
  }
);

export default apiClient;