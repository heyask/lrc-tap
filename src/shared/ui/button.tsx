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

const KBD_CLASSES: Record<Variant, string> = {
  primary: 'border-zinc-950/25 text-zinc-950/70',
  subtle: 'border-zinc-600 text-zinc-400',
  ghost: 'border-zinc-700 text-zinc-500',
  danger: 'border-rose-400/40 text-rose-300/70',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  /** Key that triggers the same action, e.g. `Space`. */
  shortcut?: string
  /** `inline` prints a kbd chip next to the label; `tooltip` keeps the button narrow. */
  shortcutDisplay?: 'inline' | 'tooltip'
  children: ReactNode
}

export function Button({
  variant = 'subtle',
  size = 'md',
  shortcut,
  shortcutDisplay = 'inline',
  className,
  title,
  children,
  ...rest
}: ButtonProps) {
  const showChip = shortcut !== undefined && shortcutDisplay === 'inline'

  return (
    <button
      type="button"
      title={resolveTitle({ title, shortcut, children })}
      {...(shortcut === undefined ? {} : { 'aria-keyshortcuts': shortcut })}
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
      {showChip && (
        <kbd
          className={cx('rounded border px-1 font-mono text-xs leading-4', KBD_CLASSES[variant])}
        >
          {shortcut}
        </kbd>
      )}
    </button>
  )
}

/** An explicit title wins; otherwise a text label and its key make one. */
function resolveTitle({
  title,
  shortcut,
  children,
}: {
  title: string | undefined
  shortcut: string | undefined
  children: ReactNode
}): string | undefined {
  if (title !== undefined) return title
  if (shortcut === undefined) return undefined
  return typeof children === 'string' ? `${children} (${shortcut})` : shortcut
}
