# Panel de Gestión de Idiomas (Admin)

Este documento resume la implementación del panel donde los administradores pueden crear, editar, desactivar y eliminar idiomas soportados por la plataforma.

## Acceso y rutas
- Ruta: `/admin/languages` (ver `src/routes/admin.languages.tsx`).
- Control de acceso: `isAdminUser` (superuser o rol `admin`).

## Endpoints (backend)
- `GET /v1/translations/languages?skip&limit&only_active` — lista de idiomas.
- `POST /v1/translations/languages` — crea idioma `{ code, name, native_name, sort_order }`.
- `PUT /v1/translations/languages/{language_id}` — actualiza `{ name, native_name, is_active, sort_order }`.
- `DELETE /v1/translations/languages/{language_id}` — elimina idioma.

## Implementación frontend
### Componentes y vista
- `src/features/admin/views/AdminLanguagesView.tsx`
  - Tabla + acciones (crear, editar, eliminar, toggle activo).
  - Usa React Query para lecturas y mutaciones.
- Formularios:
  - `src/features/languages/components/LanguageFormModal.tsx`
  - Validación por campo (Zod) en tiempo real solo sobre el input activo.

### Servicios (capa de traducción backend → dominio)
- `src/features/languages/services/languageAdmin.service.ts`
  - Mapea `snake_case` del backend a `camelCase` (`code → isoCode`, `native_name → nativeName`, `is_active → isActive`, `sort_order → sortOrder`).
  - Lanza `Error` con mensajes legibles usando `getApiErrorMessage` (soporta `{ "detail": "..." }`).
  - Fallback de error: `"Error desconocido."`.

### React Query
- `useLanguagesQuery` (`src/features/languages/queries/useLanguagesQuery.ts`)
  - `queryKey`: `['languages']`.
  - `staleTime: 60_000`, `retry: 1`.
  - Sincroniza resultados en el store global `useLanguagesStore`.
- Mutaciones (crear/editar/eliminar/toggle) invalidan o actualizan la cache de `['languages']`.

### Store global de idiomas
- `src/features/languages/store/languages.store.ts`
  - Fuente de verdad para toda la UI (selectores, traductor, providers).
  - Métodos: `setLanguages`, `upsertLanguage`, `removeLanguage`, `getByIsoCode`.
  - Se mantiene orden alfabético en UI (aunque existe `sort_order`).

## Reglas de UX
- Validación inmediata por campo (sin lag global).
- ISO bloqueado en modo edición.
- Mostrar errores del backend con `error.message` (ej. `{ "detail": "..." }`), fallback “Error desconocido.”.
- Confirmación previa al eliminar.
- Toggle de activo deshabilita/oculta idioma en selectores de la app.

## Relación con otros módulos
- Traductor y Providers consumen el store global; al crear/editar un idioma, los selectores se actualizan automáticamente.
- Providers restringen idiomas de entrada/salida según el catálogo cargado.

## Próximos pasos sugeridos
- Soporte de paginación real (usar `skip/limit` de la UI).
- Filtro `only_active=true` en módulos que no requieran ver inactivos.
- Auditoría de cambios (historial) si el backend lo expone.
