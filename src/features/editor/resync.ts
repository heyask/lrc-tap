import { LyricLine } from '../lrc/lyric-line.ts'
import { LineRange } from './line-range.ts'

/** How far before the range playback starts, so there is a run-up to the first line. */
const LEAD_IN_MS = 1000

/**
 * Where a re-sync run should start: one second before the first already-tagged
 * line in the range. Returns null when no line in the range is tagged — the
 * caller then starts from wherever the playhead already is.
 */
export function findResyncStartMs({
  lines,
  range,
}: {
  lines: LyricLine[]
  range: LineRange
}): number | null {
  for (let index = range.start; index <= range.end; index += 1) {
    const timeMs = lines[index]?.timeMs
    if (timeMs !== undefined && timeMs !== null) return Math.max(0, timeMs - LEAD_IN_MS)
  }
  return null
}
