import { RouteProgress } from "@/components/route-progress"
import { AppUpdateChecker } from "@/components/providers/app-update-checker"
import { BuildInfo } from "@/components/build-info"
import { LanguageProvider } from "@/components/providers/language"
import { ThemeProvider } from "@/components/theme-provider"
import React from "react"
import ReactDOM from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router"
import { Provider } from "jotai"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { App } from "./App"
import "./styles.css"
import { startDevtoolsGuard } from "@/lib/devtools-guard"
import { useObjectTranslation } from "@/local/object"

function AppToaster() {
  const tx = useObjectTranslation()
  return <Toaster labels={{ dismiss: tx("关闭") }} />
}

const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
})
if (startDevtoolsGuard()) {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Provider>
        <QueryClientProvider client={client}>
          <LanguageProvider>
            <ThemeProvider storageKey="one-object:theme">
              <TooltipProvider>
                <BuildInfo />
                <AppUpdateChecker />
                <BrowserRouter>
                  <RouteProgress />
                  <App />
                </BrowserRouter>
                <AppToaster />
              </TooltipProvider>
            </ThemeProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </Provider>
    </React.StrictMode>,
  )
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(
        `${import.meta.env.BASE_URL}sw.js?build=${encodeURIComponent(__APP_BUILD_ID__)}`,
        { scope: import.meta.env.BASE_URL },
      )
      .catch((error: unknown) =>
        console.error("PWA registration failed", error),
      )
  })
}
