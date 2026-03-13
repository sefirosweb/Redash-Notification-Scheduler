import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-violet-100 text-violet-700',
  success: 'bg-green-100 text-green-700',
  destructive: 'bg-red-100 text-red-700',
  secondary: 'bg-slate-100 text-slate-600',
  outline: 'border border-slate-300 text-slate-600',
}

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
