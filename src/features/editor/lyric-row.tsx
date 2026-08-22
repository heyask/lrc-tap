import { DragEvent, memo, useRef, useState } from 'react'
import { NUDGE_STEP_MS, SHORTCUT } from '../../shared/keyboard/shortcut-map.ts'
import { cx } from '../../shared/ui/cx.ts'
import { audioEngine } from '../audio/audio-engine.ts'
import { LyricLine } from '../lrc/lyric-line.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { useEditorStore } from './editor-store.ts'
import { findNextTime } from './line-operations.ts'
import { LyricTextCell } from './lyric-text-cell.tsx'
import { NudgeButton } from './nudge-button.tsx'
import { TimestampCell } from './timestamp-cell.tsx'

type LyricRowProps = {
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
  const auditionOnSelect = useSettingsStore((state) => state.auditionOnSelect)

  const [isEditingText, setIsEditingText] = useState(false)
  /** Only a press on the grip arms a reorder, so selecting text never moves lines. */
  const gripArmed = useRef(false)

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

  function endDrag(): void {
    gripArmed.current = false
    onDragRowEnd()
  }

  return (
    <div
      role="option"
      aria-selected={isCursor || isSelected}
      tabIndex={-1}
      data-line-index={index}
      onPointerDown={handleSelect}
      onDoubleClick={() => setIsEditingText(true)}
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
        endDrag()
      }}
      onDragEnd={endDrag}
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

      <TimestampCell index={index} timeMs={line.timeMs} isCursor={isCursor} />

      <LyricTextCell
        index={index}
        text={line.text}
        isActive={isActive}
        isEditing={isEditingText}
        onClose={() => setIsEditingText(false)}
      />

      <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <NudgeButton
          index={index}
          timeMs={line.timeMs}
          deltaMs={-NUDGE_STEP_MS.medium}
          label="−0.1"
          shortcut={SHORTCUT.nudgeBackMedium}
        />
        <NudgeButton
          index={index}
          timeMs={line.timeMs}
          deltaMs={NUDGE_STEP_MS.medium}
          label="+0.1"
          shortcut={SHORTCUT.nudgeForwardMedium}
        />
      </span>
    </div>
  )
})
