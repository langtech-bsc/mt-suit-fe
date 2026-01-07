# Guía de Uso de la Plataforma BSC Translation (Usuario Final)

Esta guía explica cómo usar cada sección de la plataforma, incluyendo flujos principales, controles clave y qué esperar en cada caso. Está pensada para usuarios finales y para administradores que gestionan catálogo y accesos.

## 1) Acceso e inicio de sesión
- Ingresa en `/login` con tu usuario corporativo y contraseña.
- Si la sesión expira, el sistema intentará renovarla automáticamente; si se muestra un aviso, vuelve a iniciar sesión.
- Tras entrar, el menú superior muestra solo las secciones habilitadas según tu rol (traductor, documentos, admin de idiomas/providers/usuarios).

## 2) Traductor en línea
Ubicación: `/translator`

### Flujo básico
1. Elige idioma **Origen** y **Destino** (solo se listan idiomas soportados).
2. Escribe o pega el texto en el panel izquierdo (Texto origen).
3. Pulsa el botón principal según el modo seleccionado:
   - Traducir (modo Traducción)
   - Corregir gramática (modo Grammar Checker)
   - Traducir / Mejorar (modo Post-Editing)
4. Observa el resultado en el panel derecho; el texto llega en streaming.
5. Exporta cuando aparezca habilitado (txt/docx según contexto).

### Modos
- **Traducción**: transforma texto de Origen a Destino con streaming en vivo.
- **Grammar Checker**: revisa gramática/ortografía en un solo idioma (solo se muestra un selector).
- **Post-Editing**: usa la traducción del panel derecho y aplica mejoras de estilo (tono y longitud configurables).

### Controles clave
- **Selector de modelo**: solo superusers pueden cambiarlo; el resto lo ve bloqueado.
- **Cancelar**: si el streaming sigue activo, puedes cancelarlo para corregir texto o cambiar ajustes.
- **Estados**: se muestran mensajes y barras de progreso; si hay errores, verás el mensaje devuelto por el backend (`{"detail":"..."}`).

### Casos a considerar
- Si cambias de modo, el panel derecho se resetea para evitar confusiones.
- No se deshabilita el input al escribir; el streaming responde a cada solicitud enviada (puedes cancelar si quieres detener).

## 3) Traducción de documentos
Ubicación: `/translator/documents`

### Flujo básico
1. En **Configuración rápida** elige Idioma origen, Idioma destino, Modelo/Provider y Formato de salida.
2. Sube tu archivo (PDF, DOCX, TXT) arrastrando o usando el selector.
3. Pulsa **Traducir documento** para iniciar. La barra de progreso muestra el avance en tiempo real.
4. Cuando finaliza, usa **Descargar documento traducido**.
5. **Limpiar** reinicia el flujo; **Cancelar** detiene un proceso en curso.

### Casos a considerar
- Si faltan idiomas o modelos, verás avisos. Solo se muestran idiomas soportados por el catálogo.
- El botón de traducir se deshabilita si no hay archivo o faltan selecciones.
- El progreso refleja el estado de procesamiento; ante errores, se mostrará el mensaje de backend.

## 4) Panel de idiomas (Admin)
Ubicación: `/admin/languages`

- Lista idiomas activos/inactivos; puedes crear, editar, activar/desactivar y eliminar.
- El código ISO queda bloqueado al editar; validación en tiempo real por campo.
- Los cambios se propagan al traductor y a los providers (selectores se actualizan automáticamente).
- Los errores del backend se muestran como `{"detail":"..."}` o “Error desconocido.” si no hay mensaje.

## 5) Panel de providers/modelos (Admin)
Ubicación: `/admin/providers`

- Gestiona providers: nombre, tipo, endpoint, API key, idiomas de entrada/salida soportados, activo/por defecto.
- Crear/editar requiere al menos un idioma de entrada y uno de salida.
- Los pares de idiomas definen qué combinaciones se permiten en el traductor.
- Errores se muestran con el mensaje devuelto; validación por campo en tiempo real (incluye URL y JSON de configuración).

## 6) Panel de usuarios y roles (Superadmin)
Ubicación: `/admin/users`

- Lista usuarios, filtra por estado/rol, crea/edita y elimina.
- Al crear un usuario **siempre** asigna un rol (campo obligatorio).
- Al editar:
  - Puedes cambiar rol y marcar como superuser solo si el rol es admin.
  - No puedes activar/desactivar tu propia cuenta; el toggle se deshabilita para ti.
- Errores se muestran tal cual el backend los envía (ej. `{"detail":"Username already registered"}`).

## 7) Temas y accesibilidad
- Tema claro/oscuro con ajuste automático del logo (BSC-white en modo oscuro).
- Validaciones por campo para feedback inmediato sin bloquear la escritura.
- Texto y botones usan contrastes adecuados en ambos temas.

## 8) Problemas comunes y cómo resolver
- **Modelos no disponibles**: recarga la vista; si persiste, contacta a un admin de providers.
- **Sin roles disponibles** al crear usuario: refresca o pide a un superadmin cargar roles.
- **Errores `{ "detail": "..." }`**: sigue la instrucción del mensaje; si ves “Error desconocido.”, contacta soporte.
- **No puedo traducir**: verifica que haya texto o archivo, y que idioma origen/destino estén seleccionados.
- **Exportar deshabilitado**: espera a que haya resultado o a que el proceso termine.

## 9) Buenas prácticas
- Revisa que el modelo soporta los idiomas elegidos; si no, ajusta el destino/origen.
- Usa “Cancelar” si necesitas corregir el texto antes de que termine el streaming.
- En documentos, confirma formato de salida antes de traducir para evitar reprocesos.
- Como admin, evita eliminar idiomas que estén en uso por providers hasta tener un reemplazo.
