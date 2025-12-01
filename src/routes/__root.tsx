import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

const RootLayout = () => (
  <>
    <div className="p-4 flex gap-4 text-sm font-medium">
      <Link to="/" className="[&.active]:text-bsc-blue-medium">
        Home
      </Link>
      <Link to="/about" className="[&.active]:text-bsc-blue-medium">
        About
      </Link>
      <Link to="/ui" className="[&.active]:text-bsc-blue-medium">
        UI Kit
      </Link>
    </div>
    <hr />
    <Outlet />
    <TanStackRouterDevtools />
  </>
)

export const Route = createRootRoute({ component: RootLayout })
