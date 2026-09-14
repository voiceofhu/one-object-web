import { core } from "./core"
import { uploads } from "./uploads"
import { keys } from "./keys"
export const objectEnglish: Record<string, string> = {
  ...core,
  ...uploads,
  ...keys,
}
