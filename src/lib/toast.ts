import { toast as oneToast } from "@/components/ui/toast"

export const toast: typeof oneToast = Object.assign(
  (...args: Parameters<typeof oneToast>) => oneToast(...args),
  oneToast,
  {
    error: (...args: Parameters<typeof oneToast.error>) =>
      oneToast.error(args[0], {
        ...args[1],
        duration: Infinity,
        dismissible: true,
      }),
  },
)
