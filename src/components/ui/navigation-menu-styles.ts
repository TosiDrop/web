import { cva } from "class-variance-authority"

export const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white hover:bg-white/10 focus:bg-white/10 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-white/10 outline-none transition-colors"
)