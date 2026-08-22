import { memo, useState } from 'react'
import { formatTimestamp } from '../../shared/time/format-timestamp.ts'
import { parseTimestamp } from '../../shared/time/parse-timestamp.ts'
import { cx } from '../../shared/ui/cx.ts'
import { useAutoFocus } from '../../shared/ui/use-auto-focus.ts'
import { audioEngine } from '../audio/audio-engine.ts'
import { LyricLine } from '../lrc/lyric-line.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { useEditorStore } from './editor-store.ts'
import { findNextTime } from './line-operations.ts'

const NUDGE_MS = 100

export type LyricRowProps = {
  line: LyricLine
  index: number
  isCursor: boolean
  isSelected: boolean
  isActive: boolean
  hasOrderingIssue: boolean
}

export const LyricRow = memo(function LyricRow({
  line,
  index,
  isCursor,
  isSelected,
  isActive,
  hasOrderingIssue,
}: LyricRowProps) {
  const moveCursor = useEditorStore((state) => state.moveCursor)
  const setLineTime = useEditorStore((state) => state.setLineTime)
  const setLineText = useEditorStore((state) => state.setLineText)
  const auditionOnSelect = useSettingsStore((state) => state.auditionOnSelect)

  const [timeDraft, setTimeDraft] = useState<string | null>(null)
  const [timeDraftInvalid, setTimeDraftInvalid] = useState(false)
  const [textDraft, setTextDraft] = useState<string | null>(null)
  const autoFocus = useAutoFocus<HTMLInputElement>()

  const isBlank = line.text.trim() === ''

  function handleSelect(event: { shiftKey: boolean }): void {
    moveCursor({ index, extendSelection: event.shiftKey })
    if (event.shiftKey || line.timeMs === null) return

    if (auditionOnSelect) {
      const { lines } = useEditorStore.getState()
      audioEngine.playSegment({ fromMs: line.timeMs, untilMs: findNextTime({ lines, index }) })
      return
    }
    audioEngine.seek({ timeMs: line.timeMs })
  }

  function commitTimeDraft(): void {
    if (timeDraft === null) return
    if (timeDraft.trim() === '') {
      setLineTime({ index, timeMs: null })
      setTimeDraft(null)
      return
    }

    const timeMs = parseTimestamp({ text: timeDraft })
    if (timeMs === null) {
      setTimeDraftInvalid(true)
      return
    }

    setLineTime({ index, timeMs })
    setTimeDraft(null)
    setTimeDraftInvalid(false)
  }

  function commitTextDraft(): void {
    if (textDraft === null) return
    setLineText({ index, text: textDraft })
    setTextDraft(null)
  }

  return (
    <div
      role="option"
      aria-selected={isCursor || isSelected}
      tabIndex={-1}
      data-line-index={index}
      onPointerDown={handleSelect}
      onDoubleClick={() => setTextDraft(line.text)}
      className={cx(
        'group flex items-center gap-2 border-l-2 py-1 pr-2 pl-1 text-sm',
        isCursor ? 'bg-zinc-800' : isSelected ? 'bg-teal-500/10' : 'hover:bg-zinc-900',
        hasOrderingIssue
          ? 'border-l-rose-500'
          : isActive
            ? 'border-l-amber-400'
            : 'border-l-transparent',
      )}
    >
      <span className="w-8 shrink-0 text-right font-mono text-xs text-zinc-600 tabular-nums">
        {index + 1}
      </span>

      {timeDraft === null ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setTimeDraft(line.timeMs === null ? '' : formatTimestamp({ timeMs: line.timeMs }))
          }}
          className={cx(
            'w-20 shrink-0 rounded px-1 text-left font-mono text-xs tabular-nums hover:bg-zinc-700',
            line.timeMs === null ? 'text-zinc-600' : isCursor ? 'text-teal-300' : 'text-zinc-400',
          )}
        >
          {line.timeMs === null ? '--:--.--' : formatTimestamp({ timeMs: line.timeMs })}
        </button>
      ) : (
        <input
          ref={autoFocus}
          value={timeDraft}
          onChange={(event) => {
            setTimeDraft(event.target.value)
            setTimeDraftInvalid(false)
          }}
          onBlur={commitTimeDraft}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Enter') commitTimeDraft()
            if (event.key === 'Escape') {
              setTimeDraft(null)
              setTimeDraftInvalid(false)
            }
          }}
          className={cx(
            'w-20 shrink-0 rounded border bg-zinc-950 px-1 font-mono text-xs tabular-nums outline-none',
            timeDraftInvalid ? 'border-rose-500 text-rose-300' : 'border-teal-500 text-zinc-100',
          )}
        />
      )}

      {textDraft === null ? (
        <span
          title="Double-click to edit the words"
          className={cx(
            'min-w-0 flex-1 truncate',
            isBlank ? 'text-zinc-700 italic' : isActive ? 'text-amber-200' : 'text-zinc-200',
          )}
        >
          {isBlank ? '—' : line.text}
        </span>
      ) : (
        <input
          ref={autoFocus}
          value={textDraft}
          onChange={(event) => setTextDraft(event.target.value)}
          onBlur={commitTextDraft}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Enter') commitTextDraft()
            if (event.key === 'Escape') setTextDraft(null)
          }}
          className="min-w-0 flex-1 rounded border border-teal-500 bg-zinc-950 px-1 text-zinc-100 outline-none"
        />
      )}

      <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <NudgeButton index={index} line={line} deltaMs={-NUDGE_MS} label="−0.1" />
        <NudgeButton index={index} line={line} deltaMs={NUDGE_MS} label="+0.1" />
      </span>
    </div>
  )
})

function NudgeButton({
  index,
  line,
  deltaMs,
  label,
}: {
  index: number
  line: LyricLine
  deltaMs: number
  label: string
}) {
  const setLineTime = useEditorStore((state) => state.setLineTime)

  return (
    <button
      type="button"
      disabled={line.timeMs === null}
      onClick={(event) => {
        event.stopPropagation()
        if (line.timeMs === null) return
        setLineTime({ index, timeMs: line.timeMs + deltaMs })
      }}
      className="rounded px-1 font-mono text-xs text-zinc-500 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-30"
    >
      {label}
    </button>
  )
}
