import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-slate-600 bg-slate-800 text-white placeholder:text-slate-400 focus-visible:ring-blue-500",
        outline: "border-slate-600 bg-transparent text-white placeholder:text-slate-400 focus-visible:ring-blue-500",
        ghost: "border-transparent bg-slate-800/50 text-white placeholder:text-slate-400 focus-visible:ring-blue-500",
      },
      size: {
        default: "h-10 px-3 py-2",
        sm: "h-9 rounded-md px-2 py-1 text-sm",
        lg: "h-11 rounded-md px-4 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }