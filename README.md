<div align="center">

# BSC Translation Frontend

Interfaz web para el módulo de traducción, grammar checker y post-editing del Barcelona Supercomputing Center.

</div>

## 🧭 Objetivos

- Proveer una UI accesible y consistente para los flujos de traducción.
- Proteger el acceso al traductor mediante login, validación de sesión y control de roles.
- Facilitar la integración futura con el backend reemplazando únicamente los mocks de servicio.

## 🛠️ Stack

- [Vite](https://vitejs.dev/) + React 19 + TypeScript
- [@tanstack/router](https://tanstack.com/router) para rutas declarativas y protecciones
- [Zustand](https://github.com/pmndrs/zustand) para el estado de autenticación
- UI propia ubicada en `src/components/ui`

## 🚀 Puesta en marcha

```bash
npm install
npm run dev
```

### Scripts útiles

- `npm run dev` – arranca la app en modo desarrollo.
- `npm run build` – genera el bundle productivo.
- `npm run lint` – revisa reglas ESLint + SonarQube styleguide.

## ⚙️ Variables de entorno

Copiar `.env.example` → `.env` y ajustar:

| Variable | Descripción |
| --- | --- |
| `VITE_API_BASE_URL` | URL base del backend (incluye `/v1` si tu API versiona ahí). |
| `VITE_AUTH_SESSION_TTL_MINUTES` | Tiempo (min) que mantendremos el token en storage mientras llegan las cookies HttpOnly. |

## 🔐 Flujo de autenticación

1. **Login** (`/login`): formulario con usuario + password, validado en frontend (Zod + React Hook Form).
2. **Servicio** (`src/features/auth/services/auth.service.ts`): invoca `POST /v1/auth/login` y luego `GET /v1/users/me` para poblar el perfil y los roles.
3. **Store** (`src/features/auth/store/auth.store.ts`): persiste sesión segura (localStorage o sessionStorage según “Recordar sesión”), expone `login`, `logout`, `fetchProfile`, `restoreSession` e `isSessionValid`.
4. **Protección de rutas**:
   - `/translator` usa `beforeLoad` para redirigir a `/login` si la sesión no existe o venció.
   - `/login` detecta sesiones activas y redirige automáticamente al traductor.
5. **Gestión de expiración**: `SessionManager` programa un timeout hasta `expiresAt`; al vencer, hace logout y muestra mensaje “Sesión finalizada”.

## 🧩 Estructura relevante

```
src/
├─ api/apiClient.ts          # Axios + interceptors con limpieza de sesión
├─ components/ui             # Librería de componentes reutilizables
├─ features/
│  ├─ auth/
│  │  ├─ services/auth.service.ts
│  │  ├─ store/auth.store.ts
│  │  ├─ utils/authStorage.ts
│  │  └─ views/LoginView.tsx
│  └─ translator/views/TranslatorView.tsx
├─ routes/
│  ├─ translator.tsx         # Ruta protegida
│  ├─ login.tsx              # Ruta pública
│  └─ types.ts               # Paths permitidos para redirecciones
└─ routeTree.gen.ts
```

## 👤 Panel de administración

- Ruta protegida `/admin/users` (solo `is_superuser`): muestra el perfil del super admin, estados de roles y placeholders para el CRUD de usuarios.
- Componentes reutilizados: `Card`, `Alert`, `Badge`, `Button`, `PageLoader` para mantener consistencia visual.
- Cuando el backend exponga `GET /v1/users` y endpoints de roles, solo habrá que conectar la tabla y las acciones dentro de esta vista ya maquetada.

## ✅ Flujo funcional actual

1. Ir a `/login`, ingresar credenciales reales del backend.
2. Activar o desactivar “Recordar sesión”; condiciona si se usa `localStorage` o `sessionStorage`.
3. Tras el login se redirige al `/translator`. Si el usuario es super admin se expone además `/admin/users` para la futura consola de permisos.
4. Al cerrar sesión o expirar el token, se limpia el storage y se navega de vuelta al login con el mensaje correspondiente.

## 🧪 Próximos pasos sugeridos

1. Implementar refresco de token/cookies cuando el backend exponga `Set-Cookie` HttpOnly.
2. Exponer CRUD real de usuarios/roles en `/admin/users`.
3. Conectar las acciones del traductor a los endpoints reales cuando estén listos.

---

Mantengamos el código alineado con las reglas de SonarQube: tipado estricto, separación de responsabilidades y sin datos sensibles en el cliente. 💙
