import { formatDelta } from '../../shared/time/format-timestamp.ts'
import { Button } from '../../shared/ui/button.tsx'
import { audioEngine } from '../audio/audio-engine.ts'
import { selectionRange, useEditorStore } from './editor-store.ts'
import { countUntagged, findOrderingIssues } from './line-operations.ts'
import { rangeLength } from './line-range.ts'
import { findResyncStartMs } from './resync.ts'

const FINE_NUDGE_MS = 100
const COARSE_NUDGE_MS = 500

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
          Tap Space on each line. Lines outside the range are untouched.
        </span>
        <Button size="sm" variant="subtle" className="ml-auto" onClick={stopResync}>
          Stop (Esc)
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
          <Button size="sm" variant="ghost" onClick={sortTimes}>
            Sort by time
          </Button>
        </>
      )}

      <span className="ml-auto flex items-center gap-2">
        <span className="text-zinc-500">
          {selectedCount === 1
            ? `Line ${range.start + 1}`
            : `Lines ${range.start + 1}–${range.end + 1}`}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => nudgeSelection({ deltaMs: -COARSE_NUDGE_MS })}
        >
          {formatDelta({ deltaMs: -COARSE_NUDGE_MS })}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => nudgeSelection({ deltaMs: -FINE_NUDGE_MS })}
        >
          {formatDelta({ deltaMs: -FINE_NUDGE_MS })}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => nudgeSelection({ deltaMs: FINE_NUDGE_MS })}
        >
          {formatDelta({ deltaMs: FINE_NUDGE_MS })}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => nudgeSelection({ deltaMs: COARSE_NUDGE_MS })}
        >
          {formatDelta({ deltaMs: COARSE_NUDGE_MS })}
        </Button>
        <Button size="sm" variant="primary" onClick={startResync} disabled={lines.length === 0}>
          Re-sync
        </Button>
        <Button size="sm" variant="ghost" onClick={clearSelectionTimes}>
          Clear times
        </Button>
        <Button size="sm" variant="danger" onClick={deleteSelection}>
          Delete
        </Button>
      </span>
    </div>
  )
}
