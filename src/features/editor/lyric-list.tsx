import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { scrollRowIntoView } from '../../shared/ui/scroll-into-view.ts'
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
  const moveCursor = useEditorStore((state) => state.moveCursor)
  const moveSelection = useEditorStore((state) => state.moveSelection)
  const isPlaying = useAudioStore((state) => state.isPlaying)
  const followPlayhead = useSettingsStore((state) => state.followPlayhead)
  const activeIndex = useActiveLineIndex()

  const containerRef = useRef<HTMLDivElement>(null)
  /** Index the dragged block would land before; `lines.length` means the end. */
  const [dropBeforeIndex, setDropBeforeIndex] = useState<number | null>(null)

  const range = selectionRange({ cursorIndex, selectionAnchor })
  const hasRange = selectionAnchor !== null

  const issues = useMemo(() => new Set(findOrderingIssues({ lines })), [lines])

  useEffect(() => {
    scrollToLine({ container: containerRef.current, index: cursorIndex })
  }, [cursorIndex])

  useEffect(() => {
    if (!isPlaying || !followPlayhead || activeIndex < 0) return
    scrollToLine({ container: containerRef.current, index: activeIndex })
  }, [activeIndex, isPlaying, followPlayhead])

  /** Grabbing a row outside the selection makes that row the selection. */
  const handleDragRowStart = useCallback(
    ({ index }: { index: number }) => {
      const current = selectionRange(useEditorStore.getState())
      if (!isInRange({ range: current, index })) {
        moveCursor({ index, extendSelection: false })
      }
    },
    [moveCursor],
  )

  const handleDragRowOver = useCallback(
    ({ index, isBelowMiddle }: { index: number; isBelowMiddle: boolean }) => {
      setDropBeforeIndex(isBelowMiddle ? index + 1 : index)
    },
    [],
  )

  const handleDragRowEnd = useCallback(() => {
    setDropBeforeIndex((pending) => {
      if (pending !== null) moveSelection({ beforeIndex: pending })
      return null
    })
  }, [moveSelection])

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
          isDropTarget={dropBeforeIndex === index}
          isDropTargetEnd={dropBeforeIndex === lines.length && index === lines.length - 1}
          onDragRowStart={handleDragRowStart}
          onDragRowOver={handleDragRowOver}
          onDragRowEnd={handleDragRowEnd}
        />
      ))}
    </div>
  )
}

function scrollToLine({
  container,
  index,
}: {
  container: HTMLDivElement | null
  index: number
}): void {
  scrollRowIntoView({ row: container?.querySelector(`[data-line-index="${index}"]`) })
}
