import { cx } from '../../shared/ui/cx.ts'
import { useAutoFocus } from '../../shared/ui/use-auto-focus.ts'
import { useEditorStore } from './editor-store.ts'

/**
 * The words themselves. The row decides when editing opens — it owns the
 * double-click — and this cell only has to render the field while it is.
 */
export function LyricTextCell({
  index,
  text,
  isActive,
  isEditing,
  onClose,
}: {
  index: number
  text: string
  isActive: boolean
  isEditing: boolean
  onClose: () => void
}) {
  const setLineText = useEditorStore((state) => state.setLineText)
  const autoFocus = useAutoFocus<HTMLInputElement>()

  if (!isEditing) {
    const isBlank = text.trim() === ''
    return (
      <span
        title="Double-click to edit the words"
        className={cx(
          'min-w-0 flex-1 truncate',
          isBlank ? 'text-zinc-700 italic' : isActive ? 'text-amber-200' : 'text-zinc-200',
        )}
      >
        {isBlank ? '—' : text}
      </span>
    )
  }

  function commit(value: string): void {
    setLineText({ index, text: value })
    onClose()
  }

  // Uncontrolled: the field is mounted fresh when editing opens, so the
  // current words are already the right starting value.
  return (
    <input
      ref={autoFocus}
      defaultValue={text}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') commit(event.currentTarget.value)
        if (event.key === 'Escape') onClose()
      }}
      className="min-w-0 flex-1 rounded border border-teal-500 bg-zinc-950 px-1 text-zinc-100 outline-none"
    />
  )
}
