import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

export function About() {
  return <div className="p-2">Hola desde la sección Acerca de.</div>
}
