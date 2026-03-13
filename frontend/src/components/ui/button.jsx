import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-violet-600 text-white hover:bg-violet-700',
  destructive: 'bg-red-500 text-white hover:bg-red-600',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
}

const sizes = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-7 px-2.5 text-xs',
  lg: 'h-10 px-6 text-base',
  icon: 'h-9 w-9',
}

export function Button({ className, variant = 'default', size = 'default', ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}
