export const common = {
  navbar: {
    goHomeAria: 'Go to BSC Translation home',
    home: 'Home',
    translator: 'Translator',
    documents: 'Documents',
    languages: 'Languages',
    providers: 'Providers',
    users: 'Users',
    theme: {
      switchToLightAria: 'Switch to light mode',
      switchToDarkAria: 'Switch to dark mode',
      lightMode: 'Light mode',
      darkMode: 'Dark mode',
    },
    logout: 'Log out',
    login: 'Log in',
    languageAria: 'Language',
  },
  loaders: {
    preparingUi: 'Preparing interface…',
  },
  login: {
    hero: {
      productName: 'BSC Translation',
      title: 'Access the Smart Translation panel',
      description: 'Neural translation, grammar checker and post-editing in a single secure space for BSC teams.',
      bullet: 'A consistent experience for translation, grammar checker and post-editing.',
    },
    card: {
      title: 'Welcome back',
      subtitle: 'Use your corporate credentials to continue.',
      footer: 'If you need access, contact BSC IT Security.',
    },
    alerts: {
      sessionEndedTitle: 'Session ended',
      loginFailedTitle: "We couldn't sign you in",
    },
    session: {
      expired: 'Your session expired. Please sign in again to continue.',
      unauthorized: 'Sign in to access the Translator.',
    },
    form: {
      usernameLabel: 'Username',
      usernamePlaceholder: 'corporate.user',
      passwordLabel: 'Password',
      rememberMe: 'Remember session',
      submit: 'Sign in',
      submitting: 'Validating credentials…',
    },
    validation: {
      usernameRequired: 'Username is required.',
      passwordMin: 'Password must be at least 8 characters.',
      genericFailure: "We couldn't sign in. Please try again.",
    },
  },
} as const;

