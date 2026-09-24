import { core } from "./core"
import { uploads } from "./uploads"
import { providerGuides } from "./provider-guides"
import { keys } from "./keys"
export const objectEnglish: Record<string, string> = {
  ...core,
  ...providerGuides,
  ...uploads,
  ...keys,
}
