import { useEditorStore } from './editor-store.ts'

/** Hover control that shifts one line's timestamp, mirroring the `[` / `]` keys. */
export function NudgeButton({
  index,
  timeMs,
  deltaMs,
  label,
  shortcut,
}: {
  index: number
  timeMs: number | null
  deltaMs: number
  label: string
  shortcut: string
}) {
  const setLineTime = useEditorStore((state) => state.setLineTime)

  return (
    <button
      type="button"
      disabled={timeMs === null}
      title={`Move this line by ${label}s (${shortcut})`}
      aria-keyshortcuts={shortcut}
      onClick={(event) => {
        event.stopPropagation()
        if (timeMs === null) return
        setLineTime({ index, timeMs: timeMs + deltaMs })
      }}
      className="rounded px-1 font-mono text-xs text-zinc-500 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-30"
    >
      {label}
    </button>
  )
}
