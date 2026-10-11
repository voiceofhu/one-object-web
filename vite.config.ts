import { format } from "date-fns"
import { createRequire } from "node:module"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath, URL } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const require = createRequire(import.meta.url)
const pkg = require("./package.json") as {
  appName?: string
  name: string
  version: string
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")
  const backendUrl = env.VITE_DEV_BACKEND_URL || "http://127.0.0.1:27525"
  const appName = env.VITE_APP_NAME || pkg.appName || pkg.name
  const appVersion = env.VITE_APP_VERSION?.trim() || pkg.version
  const buildTime =
    env.VITE_BUILD_TIME?.trim() ||
    format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
  const buildId = `${appVersion}:${buildTime}`

  return {
    base: env.VITE_BASE_URL || "/",
    define: {
      __APP_BUILD_TIME__: JSON.stringify(buildTime),
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_BUILD_ID__: JSON.stringify(buildId),
      "import.meta.env.VITE_BUILD_TIME": JSON.stringify(buildTime),
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "html-app-name",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "app-version.json",
            source: JSON.stringify({ build: buildTime }),
          })
        },
        transformIndexHtml: (html) => html.replaceAll("%APP_NAME%", appName),
      },
    ],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: "127.0.0.1",
      port: 27526,
      strictPort: true,
      hmr: { host: "127.0.0.1", clientPort: 27526 },
      proxy: {
        "^/api(?:/|$)": { target: backendUrl, changeOrigin: true },
        "/callback": { target: backendUrl, changeOrigin: true },
        "/healthz": { target: backendUrl, changeOrigin: true },
        "/readyz": { target: backendUrl, changeOrigin: true },
      },
    },
  }
})
