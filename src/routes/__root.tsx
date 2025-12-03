import { Suspense } from 'react'
import { createRootRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Button, PageLoader } from '../components/ui'
import { useAuthStore } from '../features/auth/store/auth.store'
import { SessionManager } from '../features/auth/components/SessionManager'

const RootLayout = () => {
  const { location } = useRouterState()
  const navigate = useNavigate()
  const isLoginRoute = location.pathname === '/login'
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const status = useAuthStore((state) => state.status)

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login', replace: true })
  }

  return (
    <>
      <SessionManager />
      {!isLoginRoute && (
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 text-sm font-medium">
          <nav className="flex flex-wrap items-center gap-4">
            <Link to="/" className="[&.active]:text-bsc-blue-medium">
              Inicio
            </Link>
            <Link to="/translator" className="[&.active]:text-bsc-blue-medium">
              Traductor
            </Link>
            <Link to="/about" className="[&.active]:text-bsc-blue-medium">
              Acerca de
            </Link>
            <Link to="/ui" className="[&.active]:text-bsc-blue-medium">
              Catálogo UI
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-xs text-gray-600">{user.email}</span>
                <Button size="sm" variant="outline" onClick={handleLogout}>
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="primary"
                disabled={status === 'authenticating'}
                onClick={() => navigate({ to: '/login' })}
              >
                Iniciar sesión
              </Button>
            )}
          </div>
        </div>
      )}
      <Suspense fallback={<PageLoader message="Preparando interfaz…" />}>
        <Outlet />
      </Suspense>
      <TanStackRouterDevtools />
    </>
  )
}

export const Route = createRootRoute({ component: RootLayout })
