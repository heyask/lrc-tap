import { useEffect, useRef } from 'react'
import { cx } from '../../shared/ui/cx.ts'
import { audioEngine } from '../audio/audio-engine.ts'
import { useActiveLineIndex } from '../audio/use-current-time.ts'
import { useEditorStore } from './editor-store.ts'

/** Plays the result back the way a player would, to check the sync feels right. */
export function PreviewPane() {
  const lines = useEditorStore((state) => state.lines)
  const activeIndex = useActiveLineIndex()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeIndex < 0) return
    const row = containerRef.current?.querySelector(`[data-preview-index="${activeIndex}"]`)
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeIndex])

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-24 text-center">
      {lines.map((line, index) => (
        <button
          key={line.id}
          type="button"
          data-preview-index={index}
          onClick={() => {
            if (line.timeMs !== null) audioEngine.seek({ timeMs: line.timeMs })
          }}
          className={cx(
            'block w-full py-2 transition-colors',
            index === activeIndex
              ? 'text-2xl font-medium text-teal-300'
              : 'text-lg text-zinc-600 hover:text-zinc-400',
          )}
        >
          {line.text.trim() === '' ? '·' : line.text}
        </button>
      ))}
    </div>
  )
}
