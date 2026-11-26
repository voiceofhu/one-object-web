import { AppInfo, formatBuildTime } from "@/components/ui/app-info"

const info = {
  "one-object-web": __APP_VERSION__,
  "build time": formatBuildTime(__APP_BUILD_TIME__, "Asia/Shanghai"),
  environment: import.meta.env.VITE_APP_ENV,
}

// Logs build metadata to the console once; renders nothing.
export function BuildInfo() {
  return <AppInfo info={info} />
}
