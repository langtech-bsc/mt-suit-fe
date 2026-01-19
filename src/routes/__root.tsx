import { Suspense } from 'react'
import { createRootRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useTranslation } from 'react-i18next'
import { Button, PageLoader } from '../components/ui'
import { BrandLogo } from '../components/BrandLogo'
import { useAuthStore } from '../features/auth/store/auth.store'
import { SessionManager } from '../features/auth/components/SessionManager'
import { useTheme } from '../features/theme/ThemeProvider'
import { isAdminUser, isSuperAdminUser } from '../features/auth/utils/authz'

export const RootLayout = () => {
  const { location } = useRouterState()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isLoginRoute = location.pathname === '/login'
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const status = useAuthStore((state) => state.status)
  const { themeState, toggleTheme } = useTheme()
  const canSeeLanguagesAdmin = isAdminUser(user)
  const canSeeProvidersAdmin = isAdminUser(user)
  const canSeeUsersAdmin = isSuperAdminUser(user)

  const isDarkTheme = themeState === 'dark'
  const themeToggleAriaLabel = isDarkTheme ? t('navbar.theme.switchToLightAria') : t('navbar.theme.switchToDarkAria')
  const themeToggleText = isDarkTheme ? t('navbar.theme.lightMode') : t('navbar.theme.darkMode')

  const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language ?? 'es'
  const selectedLanguage = resolvedLanguage.split('-')[0]

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login', replace: true })
  }

  return (
    <>
      <SessionManager />
      {!isLoginRoute && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 text-sm font-medium backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex flex-1 items-center gap-6">
            <Link to="/" className="inline-flex items-center gap-2" aria-label={t('navbar.goHomeAria')}>
              <BrandLogo showText={false} imgClassName="h-8" />
             
            </Link>
            <nav className="flex flex-wrap items-center gap-4">
              <Link to="/" className="text-slate-700 transition hover:text-bsc-blue-medium [&.active]:text-bsc-blue-medium dark:text-slate-200">
                {t('navbar.home')}
              </Link>
              <Link to="/translator" className="text-slate-700 transition hover:text-bsc-blue-medium [&.active]:text-bsc-blue-medium dark:text-slate-200">
                {t('navbar.translator')}
              </Link>
              <Link
                to="/documents"
                activeOptions={{ exact: true }}
                className="text-slate-700 transition hover:text-bsc-blue-medium [&.active]:text-bsc-blue-medium dark:text-slate-200"
              >
                {t('navbar.documents')}
              </Link>
              {/* <Link to="/about" className="text-slate-700 transition hover:text-bsc-blue-medium [&.active]:text-bsc-blue-medium dark:text-slate-200">
                Acerca de
              </Link> */}
              {/* <Link to="/ui" className="text-slate-700 transition hover:text-bsc-blue-medium [&.active]:text-bsc-blue-medium dark:text-slate-200">
                Catálogo UI
              </Link> */}
              {canSeeLanguagesAdmin && (
                <Link
                  to="/admin/languages"
                  className="text-slate-700 transition hover:text-bsc-blue-medium [&.active]:text-bsc-blue-medium dark:text-slate-200"
                >
                  {t('navbar.languages')}
                </Link>
              )}
              {canSeeProvidersAdmin && (
                <Link
                  to="/admin/providers"
                  className="text-slate-700 transition hover:text-bsc-blue-medium [&.active]:text-bsc-blue-medium dark:text-slate-200"
                >
                  {t('navbar.providers')}
                </Link>
              )}
              {canSeeUsersAdmin && (
                <Link
                  to="/admin/users"
                  className="text-slate-700 transition hover:text-bsc-blue-medium [&.active]:text-bsc-blue-medium dark:text-slate-200"
                >
                  {t('navbar.users')}
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedLanguage}
              onChange={(e) => void i18n.changeLanguage(e.target.value)}
              aria-label={t('navbar.languageAria')}
              className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-bsc-blue-medium dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="ca">Català</option>
            </select>
            <Button
              size="sm"
              variant="ghost"
              aria-label={themeToggleAriaLabel}
              onClick={toggleTheme}
              className="gap-2"
            >
              {isDarkTheme ? <SunIcon /> : <MoonIcon />}
              <span className="hidden sm:inline">{themeToggleText}</span>
            </Button>
            {user ? (
                <Button size="sm" variant="outline" onClick={handleLogout}>
                  {t('navbar.logout')}
                </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                disabled={status === 'authenticating'}
                onClick={() => navigate({ to: '/login' })}
              >
                {t('navbar.login')}
              </Button>
            )}
          </div>
        </div>
      )}
      <Suspense fallback={<PageLoader message={t('loaders.preparingUi')} />}>
        <Outlet />
      </Suspense>
      <TanStackRouterDevtools />
    </>
  )
}

export const Route = createRootRoute({ component: RootLayout })

export const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path strokeLinecap="round" d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66L19.8 4.2M4.2 19.8l1.41-1.41m13.98 0l-1.41-1.41M5.61 5.61 4.2 4.2" />
  </svg>
)

export const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
    />
  </svg>
)
