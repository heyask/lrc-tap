import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx.ts'

type Variant = 'primary' | 'subtle' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-teal-500 text-zinc-950 hover:bg-teal-400 font-medium',
  subtle: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
  ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
  danger: 'text-rose-300 hover:bg-rose-500/15',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-7 gap-1 px-2 text-xs',
  md: 'h-9 gap-2 px-3 text-sm',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function Button({
  variant = 'subtle',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-md transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
