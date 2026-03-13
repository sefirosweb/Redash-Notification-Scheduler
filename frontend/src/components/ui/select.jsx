import { cn } from '../../lib/utils'

export function Select({ className, ...props }) {
  return (
    <select
      className={cn(
        'flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 focus:border-violet-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}
