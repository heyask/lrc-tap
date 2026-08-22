import { useEffect, useRef } from 'react'
import { audioEngine } from '../audio/audio-engine.ts'
import { useActiveLineIndex } from '../audio/use-current-time.ts'
import { LyricLine } from '../lrc/lyric-line.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { useEditorStore } from './editor-store.ts'
import { findNeighbourLine, findNextTime } from './line-operations.ts'

/**
 * Shows what a player would be displaying right now, so the sync can be judged
 * without leaving the editor. The progress bar is driven straight from the
 * audio subscription — it fills every frame without re-rendering anything.
 */
export function SubtitleStrip() {
  const lines = useEditorStore((state) => state.lines)
  const moveCursor = useEditorStore((state) => state.moveCursor)
  const isExpanded = useSettingsStore((state) => state.showSubtitleStrip)
  const update = useSettingsStore((state) => state.update)
  const activeIndex = useActiveLineIndex()
  const progressRef = useRef<HTMLDivElement>(null)

  const previousIndex = findNeighbourLine({ lines, from: activeIndex, step: -1 })
  const nextIndex = findNeighbourLine({ lines, from: activeIndex, step: 1 })

  useEffect(() => {
    const bar = progressRef.current
    if (bar === null) return

    const startMs = lines[activeIndex]?.timeMs
    const endMs = findNextTime({ lines, index: activeIndex })
    if (startMs === undefined || startMs === null || endMs === null || endMs <= startMs) {
      bar.style.transform = 'scaleX(0)'
      return
    }

    return audioEngine.subscribeTime((timeMs) => {
      const ratio = (timeMs - startMs) / (endMs - startMs)
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`
    })
  }, [lines, activeIndex])

  function jumpTo({ index }: { index: number }): void {
    const line = lines[index]
    if (line === undefined) return
    moveCursor({ index, extendSelection: false })
    if (line.timeMs !== null) audioEngine.seek({ timeMs: line.timeMs })
  }

  return (
    <section className="border-t border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-2 px-3 py-1">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-600 uppercase">Subtitle</h2>
        <button
          type="button"
          onClick={() => update({ patch: { showSubtitleStrip: !isExpanded } })}
          aria-expanded={isExpanded}
          title={isExpanded ? 'Hide the subtitle preview' : 'Show the subtitle preview'}
          className="ml-auto rounded px-2 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          {isExpanded ? 'Hide ▾' : 'Show ▸'}
        </button>
      </div>

      {isExpanded && (
        <div className="px-3 pb-2 text-center">
          <NeighbourLine lines={lines} index={previousIndex} onJump={jumpTo} />

          {activeIndex < 0 ? (
            <p className="truncate py-0.5 text-base text-zinc-600 italic">
              Before the first timestamp
            </p>
          ) : (
            <button
              type="button"
              onClick={() => jumpTo({ index: activeIndex })}
              className="block w-full truncate py-0.5 text-base font-medium text-teal-300"
            >
              {lineText({ line: lines[activeIndex] })}
            </button>
          )}

          <div className="mx-auto h-0.5 w-48 overflow-hidden rounded bg-zinc-800">
            <div ref={progressRef} className="h-full origin-left scale-x-0 bg-teal-500" />
          </div>

          <NeighbourLine lines={lines} index={nextIndex} onJump={jumpTo} />
        </div>
      )}
    </section>
  )
}

function NeighbourLine({
  lines,
  index,
  onJump,
}: {
  lines: LyricLine[]
  index: number
  onJump: (input: { index: number }) => void
}) {
  if (index < 0) return <p className="py-0.5 text-sm text-zinc-800">·</p>

  return (
    <button
      type="button"
      onClick={() => onJump({ index })}
      className="block w-full truncate py-0.5 text-sm text-zinc-600 hover:text-zinc-300"
    >
      {lineText({ line: lines[index] })}
    </button>
  )
}

function lineText({ line }: { line: LyricLine | undefined }): string {
  if (line === undefined) return '·'
  return line.text.trim() === '' ? '·' : line.text
}
