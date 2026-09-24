import { toast as sonnerToast } from "sonner"

export const toast: typeof sonnerToast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  sonnerToast,
  {
    error: (...args: Parameters<typeof sonnerToast.error>) =>
      sonnerToast.error(args[0], {
        ...args[1],
        duration: Infinity,
        closeButton: true,
      }),
  },
)
