import { NUDGE_STEP_MS, SHORTCUT } from '../../shared/keyboard/shortcut-map.ts'
import { formatDelta } from '../../shared/time/format-timestamp.ts'
import { Button } from '../../shared/ui/button.tsx'
import { audioEngine, useAudioStore } from '../audio/audio-engine.ts'
import { selectionRange, useEditorStore } from './editor-store.ts'
import { countUntagged, findOrderingIssues } from './line-operations.ts'
import { rangeLength } from './line-range.ts'
import { findResyncStartMs } from './resync.ts'
import { tagCursorLine } from './tag-line.ts'

export function EditorToolbar() {
  const lines = useEditorStore((state) => state.lines)
  const cursorIndex = useEditorStore((state) => state.cursorIndex)
  const selectionAnchor = useEditorStore((state) => state.selectionAnchor)
  const resync = useEditorStore((state) => state.resync)
  const moveCursor = useEditorStore((state) => state.moveCursor)
  const nudgeSelection = useEditorStore((state) => state.nudgeSelection)
  const clearSelectionTimes = useEditorStore((state) => state.clearSelectionTimes)
  const deleteSelection = useEditorStore((state) => state.deleteSelection)
  const sortTimes = useEditorStore((state) => state.sortTimes)
  const beginResync = useEditorStore((state) => state.beginResync)
  const endResync = useEditorStore((state) => state.endResync)
  const isReady = useAudioStore((state) => state.isReady)

  const range = selectionRange({ cursorIndex, selectionAnchor })
  const selectedCount = rangeLength({ range })
  const untagged = countUntagged({ lines })
  const issues = findOrderingIssues({ lines })

  function startResync(): void {
    const startMs = findResyncStartMs({ lines, range })
    beginResync({ range })
    if (startMs !== null) audioEngine.seek({ timeMs: startMs })
    audioEngine.play()
  }

  function stopResync(): void {
    endResync()
    audioEngine.pause()
  }

  if (resync !== null) {
    return (
      <div className="flex items-center gap-3 border-b border-teal-800 bg-teal-950 px-3 py-2 text-sm">
        <span className="font-medium text-teal-200">
          Re-syncing lines {resync.range.start + 1}–{resync.range.end + 1}
        </span>
        <span className="text-teal-400/80">
          Press {SHORTCUT.tagLine} on each line. Lines outside the range are untouched.
        </span>
        <Button
          size="sm"
          variant="subtle"
          className="ml-auto"
          shortcut={SHORTCUT.stop}
          onClick={stopResync}
        >
          Stop
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-xs">
      <span className="text-zinc-400">
        {lines.length} lines
        {untagged > 0 && <span className="text-amber-400"> · {untagged} untagged</span>}
      </span>

      {issues.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => {
              const first = issues[0]
              if (first !== undefined) moveCursor({ index: first, extendSelection: false })
            }}
            className="rounded bg-rose-500/15 px-2 py-0.5 text-rose-300 hover:bg-rose-500/25"
          >
            {issues.length} out of order
          </button>
          <Button
            size="sm"
            variant="ghost"
            title="Re-deal the timestamps in ascending order"
            onClick={sortTimes}
          >
            Sort by time
          </Button>
        </>
      )}

      <span className="ml-auto flex flex-wrap items-center gap-2">
        <span className="text-zinc-500">
          {selectedCount === 1
            ? `Line ${range.start + 1}`
            : `Lines ${range.start + 1}–${range.end + 1}`}
        </span>

        <Button
          size="sm"
          variant="primary"
          disabled={lines.length === 0 || !isReady}
          shortcut={SHORTCUT.tagLine}
          title={`Stamp the playhead onto this line and move on (${SHORTCUT.tagLine}). Works while paused.`}
          onClick={tagCursorLine}
        >
          Tag line
        </Button>

        <NudgeButton
          deltaMs={-NUDGE_STEP_MS.coarse}
          shortcut={SHORTCUT.nudgeBackCoarse}
          onNudge={nudgeSelection}
        />
        <NudgeButton
          deltaMs={-NUDGE_STEP_MS.medium}
          shortcut={SHORTCUT.nudgeBackMedium}
          onNudge={nudgeSelection}
        />
        <NudgeButton
          deltaMs={NUDGE_STEP_MS.medium}
          shortcut={SHORTCUT.nudgeForwardMedium}
          onNudge={nudgeSelection}
        />
        <NudgeButton
          deltaMs={NUDGE_STEP_MS.coarse}
          shortcut={SHORTCUT.nudgeForwardCoarse}
          onNudge={nudgeSelection}
        />

        <Button
          size="sm"
          variant="subtle"
          disabled={lines.length === 0}
          title="Play this range from the top and re-tap it — lines outside stay as they are"
          onClick={startResync}
        >
          Re-sync
        </Button>
        <Button
          size="sm"
          variant="ghost"
          title="Drop the timestamps on these lines, keeping the words"
          onClick={clearSelectionTimes}
        >
          Clear times
        </Button>
        <Button
          size="sm"
          variant="danger"
          title="Remove these lines from the lyrics"
          onClick={deleteSelection}
        >
          Delete
        </Button>
      </span>
    </div>
  )
}

function NudgeButton({
  deltaMs,
  shortcut,
  onNudge,
}: {
  deltaMs: number
  shortcut: string
  onNudge: (input: { deltaMs: number }) => void
}) {
  const label = formatDelta({ deltaMs })

  return (
    <Button
      size="sm"
      variant="ghost"
      shortcut={shortcut}
      shortcutDisplay="tooltip"
      onClick={() => onNudge({ deltaMs })}
    >
      {label}
    </Button>
  )
}
