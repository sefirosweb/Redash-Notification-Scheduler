import { cn } from '../../lib/utils'

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn('border-b border-slate-200 bg-slate-50/50', className)} {...props} />
}

export function TableBody({ ...props }) {
  return <tbody {...props} />
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn('border-b border-slate-100 transition-colors hover:bg-slate-50/70', className)}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        'h-11 px-4 text-left align-middle text-xs font-semibold text-slate-500 uppercase tracking-wide',
        className
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }) {
  return (
    <td
      className={cn('px-4 py-3 align-middle text-slate-700', className)}
      {...props}
    />
  )
}
