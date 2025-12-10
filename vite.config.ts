import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"



// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  return {
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
   server: {
      host: "0.0.0.0",
      port: 8080,
      allowedHosts: [
        env.VITE_ALLOWED_HOST_APP,
        env.VITE_ALLOWED_HOST_CORE
      ],
      cors: {
        origin: [
          env.VITE_CORS_ORIGIN_APP,
          env.VITE_CORS_ORIGIN_CORE
        ]
      }
    },
    preview: {
      allowedHosts: [
        env.VITE_ALLOWED_HOST_APP,
        env.VITE_ALLOWED_HOST_CORE
      ],
      cors: {
        origin: [
          env.VITE_CORS_ORIGIN_APP,
          env.VITE_CORS_ORIGIN_CORE
        ]
      }
    },
}
})
