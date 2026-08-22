import { useEffect, useMemo, useRef } from 'react'
import { useAudioStore } from '../audio/audio-engine.ts'
import { useActiveLineIndex } from '../audio/use-current-time.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { selectionRange, useEditorStore } from './editor-store.ts'
import { findOrderingIssues } from './line-operations.ts'
import { isInRange } from './line-range.ts'
import { LyricRow } from './lyric-row.tsx'

export function LyricList() {
  const lines = useEditorStore((state) => state.lines)
  const cursorIndex = useEditorStore((state) => state.cursorIndex)
  const selectionAnchor = useEditorStore((state) => state.selectionAnchor)
  const isPlaying = useAudioStore((state) => state.isPlaying)
  const followPlayhead = useSettingsStore((state) => state.followPlayhead)
  const activeIndex = useActiveLineIndex()

  const containerRef = useRef<HTMLDivElement>(null)
  const range = selectionRange({ cursorIndex, selectionAnchor })
  const hasRange = selectionAnchor !== null

  const issues = useMemo(() => new Set(findOrderingIssues({ lines })), [lines])

  useEffect(() => {
    scrollRowIntoView({ container: containerRef.current, index: cursorIndex })
  }, [cursorIndex])

  useEffect(() => {
    if (!isPlaying || !followPlayhead || activeIndex < 0) return
    scrollRowIntoView({ container: containerRef.current, index: activeIndex })
  }, [activeIndex, isPlaying, followPlayhead])

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Lyric lines"
      aria-multiselectable
      className="min-h-0 flex-1 overflow-y-auto py-2"
    >
      {lines.map((line, index) => (
        <LyricRow
          key={line.id}
          line={line}
          index={index}
          isCursor={index === cursorIndex}
          isSelected={hasRange && isInRange({ range, index })}
          isActive={index === activeIndex}
          hasOrderingIssue={issues.has(index)}
        />
      ))}
    </div>
  )
}

function scrollRowIntoView({
  container,
  index,
}: {
  container: HTMLDivElement | null
  index: number
}): void {
  const row = container?.querySelector(`[data-line-index="${index}"]`)
  if (row === null || row === undefined) return
  row.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
