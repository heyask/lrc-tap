import { DragEvent, memo, useRef, useState } from 'react'
import { NUDGE_STEP_MS, SHORTCUT } from '../../shared/keyboard/shortcut-map.ts'
import { formatTimestamp } from '../../shared/time/format-timestamp.ts'
import { parseTimestamp } from '../../shared/time/parse-timestamp.ts'
import { cx } from '../../shared/ui/cx.ts'
import { useAutoFocus } from '../../shared/ui/use-auto-focus.ts'
import { audioEngine } from '../audio/audio-engine.ts'
import { LyricLine } from '../lrc/lyric-line.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { useEditorStore } from './editor-store.ts'
import { findNextTime } from './line-operations.ts'

export type LyricRowProps = {
  line: LyricLine
  index: number
  isCursor: boolean
  isSelected: boolean
  isActive: boolean
  hasOrderingIssue: boolean
  /** A drop would land the dragged block just above this row. */
  isDropTarget: boolean
  /** A drop would land it below the last row. */
  isDropTargetEnd: boolean
  onDragRowStart: (input: { index: number }) => void
  onDragRowOver: (input: { index: number; isBelowMiddle: boolean }) => void
  onDragRowEnd: () => void
}

export const LyricRow = memo(function LyricRow({
  line,
  index,
  isCursor,
  isSelected,
  isActive,
  hasOrderingIssue,
  isDropTarget,
  isDropTargetEnd,
  onDragRowStart,
  onDragRowOver,
  onDragRowEnd,
}: LyricRowProps) {
  const moveCursor = useEditorStore((state) => state.moveCursor)
  const setLineTime = useEditorStore((state) => state.setLineTime)
  const setLineText = useEditorStore((state) => state.setLineText)
  const auditionOnSelect = useSettingsStore((state) => state.auditionOnSelect)

  const [timeDraft, setTimeDraft] = useState<string | null>(null)
  const [timeDraftInvalid, setTimeDraftInvalid] = useState(false)
  const [textDraft, setTextDraft] = useState<string | null>(null)
  const autoFocus = useAutoFocus<HTMLInputElement>()
  /** Only a press on the grip arms a reorder, so selecting text never moves lines. */
  const gripArmed = useRef(false)

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
      draggable
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        if (!gripArmed.current) {
          event.preventDefault()
          return
        }
        event.dataTransfer.effectAllowed = 'move'
        // Firefox refuses to start a drag with an empty payload.
        event.dataTransfer.setData('text/plain', line.text)
        onDragRowStart({ index })
      }}
      onDragOver={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        const bounds = event.currentTarget.getBoundingClientRect()
        onDragRowOver({
          index,
          isBelowMiddle: event.clientY > bounds.top + bounds.height / 2,
        })
      }}
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        gripArmed.current = false
        onDragRowEnd()
      }}
      onDragEnd={() => {
        gripArmed.current = false
        onDragRowEnd()
      }}
      className={cx(
        'group flex items-center gap-2 border-y-2 border-l-2 py-1 pr-2 pl-1 text-sm',
        isDropTarget ? 'border-t-teal-400' : 'border-t-transparent',
        isDropTargetEnd ? 'border-b-teal-400' : 'border-b-transparent',
        // Not in the tab order, so its only focus is from a click — the cursor
        // highlight already shows which line is current.
        'focus:outline-none',
        isCursor ? 'bg-zinc-800' : isSelected ? 'bg-teal-500/10' : 'hover:bg-zinc-900',
        hasOrderingIssue
          ? 'border-l-rose-500'
          : isActive
            ? 'border-l-amber-400'
            : 'border-l-transparent',
      )}
    >
      <span
        aria-hidden
        title={`Drag to reorder (${SHORTCUT.moveLine})`}
        onPointerDown={() => {
          gripArmed.current = true
        }}
        onPointerUp={() => {
          gripArmed.current = false
        }}
        className="w-3 shrink-0 cursor-grab text-center text-xs text-zinc-700 opacity-0 group-hover:opacity-100"
      >
        ⠿
      </span>

      <span className="w-6 shrink-0 text-right font-mono text-xs text-zinc-600 tabular-nums">
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
        <NudgeButton
          index={index}
          line={line}
          deltaMs={-NUDGE_STEP_MS.medium}
          label="−0.1"
          shortcut={SHORTCUT.nudgeBackMedium}
        />
        <NudgeButton
          index={index}
          line={line}
          deltaMs={NUDGE_STEP_MS.medium}
          label="+0.1"
          shortcut={SHORTCUT.nudgeForwardMedium}
        />
      </span>
    </div>
  )
})

function NudgeButton({
  index,
  line,
  deltaMs,
  label,
  shortcut,
}: {
  index: number
  line: LyricLine
  deltaMs: number
  label: string
  shortcut: string
}) {
  const setLineTime = useEditorStore((state) => state.setLineTime)

  return (
    <button
      type="button"
      disabled={line.timeMs === null}
      title={`Move this line by ${label}s (${shortcut})`}
      aria-keyshortcuts={shortcut}
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
