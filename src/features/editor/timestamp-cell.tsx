import { useState } from 'react'
import { formatTimestamp } from '../../shared/time/format-timestamp.ts'
import { parseTimestamp } from '../../shared/time/parse-timestamp.ts'
import { cx } from '../../shared/ui/cx.ts'
import { useAutoFocus } from '../../shared/ui/use-auto-focus.ts'
import { useEditorStore } from './editor-store.ts'

/**
 * The timestamp column: a badge that turns into a text field when clicked.
 * A time that will not parse keeps the field open and marked rather than
 * quietly writing something else.
 */
export function TimestampCell({
  index,
  timeMs,
  isCursor,
}: {
  index: number
  timeMs: number | null
  isCursor: boolean
}) {
  const setLineTime = useEditorStore((state) => state.setLineTime)
  const [draft, setDraft] = useState<string | null>(null)
  const [isInvalid, setIsInvalid] = useState(false)
  const autoFocus = useAutoFocus<HTMLInputElement>()

  function commit(): void {
    if (draft === null) return

    if (draft.trim() === '') {
      setLineTime({ index, timeMs: null })
      setDraft(null)
      return
    }

    const parsed = parseTimestamp({ text: draft })
    if (parsed === null) {
      setIsInvalid(true)
      return
    }

    setLineTime({ index, timeMs: parsed })
    setDraft(null)
    setIsInvalid(false)
  }

  function cancel(): void {
    setDraft(null)
    setIsInvalid(false)
  }

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setDraft(timeMs === null ? '' : formatTimestamp({ timeMs }))
        }}
        className={cx(
          'w-20 shrink-0 rounded px-1 text-left font-mono text-xs tabular-nums hover:bg-zinc-700',
          timeMs === null ? 'text-zinc-600' : isCursor ? 'text-teal-300' : 'text-zinc-400',
        )}
      >
        {timeMs === null ? '--:--.--' : formatTimestamp({ timeMs })}
      </button>
    )
  }

  return (
    <input
      ref={autoFocus}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value)
        setIsInvalid(false)
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') commit()
        if (event.key === 'Escape') cancel()
      }}
      className={cx(
        'w-20 shrink-0 rounded border bg-zinc-950 px-1 font-mono text-xs tabular-nums outline-none',
        isInvalid ? 'border-rose-500 text-rose-300' : 'border-teal-500 text-zinc-100',
      )}
    />
  )
}
