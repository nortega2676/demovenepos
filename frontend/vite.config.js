import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  // Cargar variables de entorno
  const env = loadEnv(mode, process.cwd(), '')
  
  // Obtener el título de la aplicación o usar un valor por defecto
  const appTitle = env.VITE_APP_TITLE || 'La Providencia'

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_APP_TITLE': JSON.stringify(appTitle)
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true
    },
    build: {
      rollupOptions: {
        plugins: [
          {
            name: 'html-replace',
            transformIndexHtml(html) {
              return html.replace(
                /%VITE_APP_TITLE%/g,
                appTitle
              )
            }
          }
        ]
      }
    }
  }
})
