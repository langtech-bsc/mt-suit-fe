export const common = {
  navbar: {
    goHomeAria: 'Ir al inicio BSC Translation',
    home: 'Inicio',
    translator: 'Traductor',
    documents: 'Documentos',
    languages: 'Idiomas',
    providers: 'Providers',
    users: 'Usuarios',
    theme: {
      switchToLightAria: 'Cambiar a modo claro',
      switchToDarkAria: 'Cambiar a modo oscuro',
      lightMode: 'Modo claro',
      darkMode: 'Modo oscuro',
    },
    logout: 'Cerrar sesión',
    login: 'Iniciar sesión',
    languageAria: 'Idioma',
  },
  loaders: {
    preparingUi: 'Preparando interfaz…',
  },
  login: {
    hero: {
      productName: 'BSC Translation',
      title: 'Accede al panel de Traducción Inteligente',
      description: 'Traducción neural, grammar checker y post-editing en un único espacio seguro para equipos del BSC.',
      bullet: 'Experiencia consistente para traducción, grammar checker y post-editing.',
    },
    card: {
      title: 'Bienvenido de nuevo',
      subtitle: 'Usa tus credenciales corporativas para continuar.',
      footer: 'Si necesitas acceso, contacta a Seguridad TI BSC.',
    },
    alerts: {
      sessionEndedTitle: 'Sesión finalizada',
      loginFailedTitle: 'No pudimos iniciar sesión',
    },
    session: {
      expired: 'Tu sesión expiró, por favor vuelve a iniciar sesión para continuar.',
      unauthorized: 'Inicia sesión para acceder al Traductor.',
    },
    form: {
      usernameLabel: 'Usuario',
      usernamePlaceholder: 'usuario.corporativo',
      passwordLabel: 'Contraseña',
      rememberMe: 'Recordar sesión',
      submit: 'Ingresar',
      submitting: 'Validando credenciales...',
    },
    validation: {
      usernameRequired: 'El usuario es obligatorio.',
      passwordMin: 'La contraseña debe tener al menos 8 caracteres.',
      genericFailure: 'No pudimos iniciar sesión, intenta nuevamente.',
    },
  },
  home: {
    hero: {
      brandTagline: 'Plataforma de Inteligencia de Traducción',
      productName: 'BSC Translation',
      title: 'Traductor especializado con governance y control de acceso',
      description: 'Gestiona traducción, revisión gramatical y postedición en una única interfaz segura con autenticación corporativa.',
      ctaTranslator: 'Ingresar al Traductor',
      ctaAbout: 'Conoce el proyecto',
    },
    features: {
      auth: {
        caption: 'Autenticación',
        title: 'SSO + Roles',
        description: 'Acceso restringido con control de sesión y validación de roles para cada módulo.',
      },
      unified: {
        caption: 'Experiencia unificada',
        title: 'Traducción completa',
        description: 'Traducción neural, revisión gramatical y postedición integradas en un mismo flujo.',
      },
      observability: {
        caption: 'Observabilidad',
        title: 'Auditoría y registros',
        description: 'Seguimiento de sesiones para detectar expiraciones y rastrear actividad crítica.',
      },
    },
  },
} as const;
