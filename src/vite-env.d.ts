/// <reference types="vite/client" />
declare const __APP_VERSION__: string
declare const __APP_BUILD_ID__: string

declare const __APP_BUILD_TIME__: string

interface ImportMetaEnv {
  /** MD5 of the ?debug= token that bypasses the production DevTools guard. */
  readonly VITE_DEVTOOLS_BYPASS_MD5?: string
}
