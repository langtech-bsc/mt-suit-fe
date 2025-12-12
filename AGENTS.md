## AGENTS PLAYBOOK

### 1. Cliente HTTP
- Todas las llamadas HTTP deben salir desde `apiClient` para heredar interceptores (auth, redirecciones, manejo de 401/500).
- Los servicios (`src/features/**/services/*.service.ts`) son la capa que traduce payloads del backend hacia los tipos de dominio del frontend. Nada de lógica de serialización dentro de los componentes.

### 2. TanStack Query como orquestador
- Cada lectura remota deberá envolverse en `useQuery`/`useInfiniteQuery`; las mutaciones deberán usar `useMutation`.
- Define `queryKey` descriptivos (`['admin-users', { skip, limit }]`) para aprovechar cache + invalidaciones predecibles.
- Establece `retry`, `staleTime` y `gcTime` según la criticidad del dato; evita revalidaciones agresivas por defecto (usa `refetchOnWindowFocus: false` globalmente).
- Las funciones `queryFn`/`mutationFn` siempre delegan al servicio correspondiente (nunca llaman `apiClient` directamente desde el hook).
- Centraliza la gestión de errores lanzando `Error` con mensajes legibles desde la capa de servicio; los componentes solo presentan `error.message`.

### 3. Manejo de estados en UI
- Usa los flags de React Query (`isLoading`, `isFetching`, `isError`, `isPending`) para decidir loaders, botones deshabilitados y banners de error.
- Refetch manual: expón siempre un botón/acción que llame a `refetch()` o `mutate()` y comunica el estado con copy claro (“Sincronizando…”).
- Para tablas/listas, muestra la última configuración de paginación (skip/limit) para facilitar debugging con QA/Backend.

### 4. Persistencia y autenticación
- El store de auth (Zustand) sigue siendo la fuente de verdad para tokens/usuario. Las queries deben leer del store solo cuando sea imprescindible (p.ej. para enviar el rol actual).
- Nunca guardes tokens en React Query; deja que los interceptores lean desde `AuthStorage`.

### 5. Documentación rápida
- Cada nuevo flujo que use este estándar debe enlazarse desde README o la sección del feature para que otros agentes sepan dónde vivirán las queries y cómo invalidarlas.

Mantén este archivo actualizado cuando introduzcamos nuevas convenciones. Si dudas, prioriza consistencia con las secciones anteriores antes de agregar nuevas reglas.
