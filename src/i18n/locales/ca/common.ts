export const common = {
  navbar: {
    goHomeAria: 'Anar a l’inici BSC Translation',
    home: 'Inici',
    translator: 'Traductor',
    documents: 'Documents',
    languages: 'Idiomes',
    providers: 'Proveïdors',
    users: 'Usuaris',
    theme: {
      switchToLightAria: 'Canvia a mode clar',
      switchToDarkAria: 'Canvia a mode fosc',
      lightMode: 'Mode clar',
      darkMode: 'Mode fosc',
    },
    logout: 'Tancar sessió',
    login: 'Iniciar sessió',
    languageAria: 'Idioma',
  },
  loaders: {
    preparingUi: 'Preparant interfície…',
  },
  login: {
    hero: {
      productName: 'BSC Translation',
      title: 'Accedeix al panell de Traducció Intel·ligent',
      description: 'Traducció neural, grammar checker i post-editing en un únic espai segur per a equips del BSC.',
      bullet: 'Experiència consistent per a traducció, grammar checker i post-editing.',
    },
    card: {
      title: 'Benvingut de nou',
      subtitle: 'Fes servir les credencials corporatives per continuar.',
      footer: 'Si necessites accés, contacta amb Seguretat TI BSC.',
    },
    alerts: {
      sessionEndedTitle: 'Sessió finalitzada',
      loginFailedTitle: 'No hem pogut iniciar sessió',
    },
    session: {
      expired: 'La teva sessió ha expirat. Torna a iniciar sessió per continuar.',
      unauthorized: 'Inicia sessió per accedir al Traductor.',
    },
    form: {
      usernameLabel: 'Usuari',
      usernamePlaceholder: 'usuari.corporatiu',
      passwordLabel: 'Contrasenya',
      rememberMe: 'Recorda la sessió',
      submit: 'Inicia sessió',
      submitting: 'Validant credencials…',
    },
    validation: {
      usernameRequired: 'El nom d’usuari és obligatori.',
      passwordMin: 'La contrasenya ha de tenir com a mínim 8 caràcters.',
      genericFailure: 'No hem pogut iniciar sessió, torna-ho a provar.',
    },
  },
  home: {
    hero: {
      brandTagline: 'Plataforma d’Intel·ligència de Traducció',
      productName: 'BSC Translation',
      title: 'Traductor especialitzat amb governança i control d’accés',
      description: 'Gestiona traducció, revisió gramatical i posteditat en una única interfície segura amb autenticació corporativa.',
      ctaTranslator: 'Entrar al Traductor',
      ctaAbout: 'Coneix el projecte',
    },
    features: {
      auth: {
        caption: 'Autenticació',
        title: 'SSO + Rols',
        description: 'Accés restringit amb control de sessió i validació de rols per a cada mòdul.',
      },
      unified: {
        caption: 'Experiència unificada',
        title: 'Traducció completa',
        description: 'Traducció neural, revisió gramatical i posteditat integrades en un mateix flux.',
      },
      observability: {
        caption: 'Observabilitat',
        title: 'Auditoria i registres',
        description: 'Seguiment de sessions per detectar expiracions i rastrejar activitat crítica.',
      },
    },
  },
} as const;
