import { LrcMetadata, LyricLine } from '../lrc/lyric-line.ts'

/** The part of the editor that undo/redo restores. */
export type EditorSnapshot = {
  lines: LyricLine[]
  metadata: LrcMetadata
  cursorIndex: number
}

const HISTORY_LIMIT = 500

/**
 * Pushes a snapshot onto the undo stack. `coalesceKey` merges consecutive edits
 * of the same kind — typing in one line is one undo step, not one per keystroke.
 */
export function pushHistory({
  past,
  snapshot,
  coalesceKey,
  lastCoalesceKey,
}: {
  past: EditorSnapshot[]
  snapshot: EditorSnapshot
  coalesceKey: string | null
  lastCoalesceKey: string | null
}): EditorSnapshot[] {
  if (coalesceKey !== null && coalesceKey === lastCoalesceKey && past.length > 0) return past

  const next = [...past, snapshot]
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
}
