import clsx from 'clsx'

type ButtonProps = {
  href?: string
  children?: any
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger' | 'bare'
  size?: 'sm' | 'xs'
  class?: string
  [key: string]: any
}

const variants: Record<string, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm dark:bg-indigo-600/90 dark:hover:bg-indigo-500',
  ghost: 'bg-slate-900/5 hover:bg-slate-900/10 text-slate-700 px-3 py-1.5 text-xs ring-1 ring-slate-200 dark:ring-0 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-200',
  subtle: 'bg-slate-100 hover:bg-slate-200 text-slate-700 ring-1 ring-slate-200 px-3 py-1.5 text-xs dark:bg-white/5 dark:hover:bg-white/10 dark:ring-white/10 dark:text-gray-200',
  danger: 'bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 text-xs dark:bg-red-500/80 dark:hover:bg-red-500',
  bare: 'bg-transparent hover:bg-slate-900/5 text-slate-600 px-2 py-1 text-xs dark:hover:bg-white/10 dark:text-gray-200',
}

const sizes: Record<string, string> = {
  sm: 'text-sm px-4 py-2',
  xs: 'text-[11px] px-2.5 py-1.5',
}

export const Button = ({ href, children, variant, size, class: className, ...rest }: ButtonProps) => {
  const cls = clsx(
    'inline-flex items-center gap-1 font-medium rounded-md transition focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-400 disabled:opacity-50 disabled:pointer-events-none',
    variants[variant ?? 'primary'],
    sizes[size ?? (variant === 'primary' ? 'sm' : 'xs')] ?? '',
    className
  )
  return href
    ? <a href={href} class={cls} {...rest}>{children}</a>
    : <button type="button" class={cls} {...rest}>{children}</button>
}

export default Button
