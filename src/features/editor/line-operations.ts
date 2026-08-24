import { createLyricLine, LyricLine } from '../lrc/lyric-line.ts'
import { isInRange, LineRange } from './line-range.ts'

/** Writes a timestamp onto one line. Times are clamped to zero, never negative. */
export function setTime({
  lines,
  index,
  timeMs,
}: {
  lines: LyricLine[]
  index: number
  timeMs: number | null
}): LyricLine[] {
  return lines.map((line, current) => {
    if (current !== index) return line
    return { ...line, timeMs: timeMs === null ? null : Math.max(0, Math.round(timeMs)) }
  })
}

export function setText({
  lines,
  index,
  text,
}: {
  lines: LyricLine[]
  index: number
  text: string
}): LyricLine[] {
  return lines.map((line, current) => (current === index ? { ...line, text } : line))
}

/** Moves every tagged line in the range by a delta, clamping at zero. */
export function shiftTimes({
  lines,
  range,
  deltaMs,
}: {
  lines: LyricLine[]
  range: LineRange
  deltaMs: number
}): LyricLine[] {
  return lines.map((line, index) => {
    if (!isInRange({ range, index }) || line.timeMs === null) return line
    return { ...line, timeMs: Math.max(0, Math.round(line.timeMs + deltaMs)) }
  })
}

/** Drops timestamps in the range, leaving the lyrics text untouched. */
export function clearTimes({
  lines,
  range,
}: {
  lines: LyricLine[]
  range: LineRange
}): LyricLine[] {
  return lines.map((line, index) =>
    isInRange({ range, index }) && line.timeMs !== null ? { ...line, timeMs: null } : line,
  )
}

/**
 * Puts a fresh, untagged line just below `index` and says where it landed — on a
 * document with no lines yet that is 0, not below the cursor. The caller gets the
 * line itself back so it can open it for typing straight away.
 */
export function insertLineAfter({ lines, index }: { lines: LyricLine[]; index: number }): {
  lines: LyricLine[]
  insertedLine: LyricLine
  insertedIndex: number
} {
  const insertedLine = createLyricLine({ text: '', timeMs: null })
  const insertedIndex = Math.min(Math.max(0, index + 1), lines.length)
  return {
    lines: [...lines.slice(0, insertedIndex), insertedLine, ...lines.slice(insertedIndex)],
    insertedLine,
    insertedIndex,
  }
}

export function removeRange({
  lines,
  range,
}: {
  lines: LyricLine[]
  range: LineRange
}): LyricLine[] {
  return lines.filter((_line, index) => !isInRange({ range, index }))
}

/** Drops every line with no lyrics text — the spacers between verses. */
export function removeBlankLines({ lines }: { lines: LyricLine[] }): LyricLine[] {
  return lines.filter((line) => line.text.trim() !== '')
}

/**
 * Puts tagged lines back in ascending time order without disturbing untagged
 * lines: the tagged times are sorted and re-dealt into the slots that already
 * held a tagged line, so lyrics keep their place on screen.
 */
export function sortTimesAscending({ lines }: { lines: LyricLine[] }): LyricLine[] {
  const sortedTimes = lines
    .flatMap((line) => (line.timeMs === null ? [] : [line.timeMs]))
    .sort((a, b) => a - b)

  let taken = 0
  return lines.map((line) => {
    if (line.timeMs === null) return line
    const timeMs = sortedTimes[taken]
    taken += 1
    return timeMs === undefined ? line : { ...line, timeMs }
  })
}

/** Indices of tagged lines whose time is earlier than the tagged line above them. */
export function findOrderingIssues({ lines }: { lines: LyricLine[] }): number[] {
  const issues: number[] = []
  let previousTimeMs: number | null = null

  lines.forEach((line, index) => {
    if (line.timeMs === null) return
    if (previousTimeMs !== null && line.timeMs < previousTimeMs) issues.push(index)
    previousTimeMs = line.timeMs
  })

  return issues
}

export function countUntagged({ lines }: { lines: LyricLine[] }): number {
  return lines.filter((line) => line.timeMs === null && line.text.trim() !== '').length
}

/** First line at or after `from` that still needs a timestamp. -1 when none remain. */
export function findNextUntagged({ lines, from }: { lines: LyricLine[]; from: number }): number {
  for (let index = Math.max(0, from); index < lines.length; index += 1) {
    const line = lines[index]
    if (line !== undefined && line.timeMs === null && line.text.trim() !== '') return index
  }
  return -1
}

/**
 * The line that should be highlighted at a given playback position: the last
 * tagged line at or before it. -1 before the first timestamp.
 */
export function findActiveIndex({ lines, timeMs }: { lines: LyricLine[]; timeMs: number }): number {
  let active = -1
  let activeTimeMs = -1

  lines.forEach((line, index) => {
    if (line.timeMs === null || line.timeMs > timeMs) return
    // >= so that on identical timestamps the later line wins, matching players.
    if (line.timeMs >= activeTimeMs) {
      activeTimeMs = line.timeMs
      active = index
    }
  })

  return active
}

/** The timestamp that ends a line's audible span — the next tagged line's time. */
export function findNextTime({
  lines,
  index,
}: {
  lines: LyricLine[]
  index: number
}): number | null {
  for (let current = index + 1; current < lines.length; current += 1) {
    const line = lines[current]
    if (line !== undefined && line.timeMs !== null) return line.timeMs
  }
  return null
}

/**
 * Moves a block of lines, timestamps and all, to sit just before the line
 * currently at `beforeIndex` (`lines.length` drops it at the end). The index is
 * read against the array as the caller sees it on screen; the shift caused by
 * lifting the block out is handled here. A move that would not change anything
 * returns the original array so callers can skip an empty undo step.
 */
export function moveRange({
  lines,
  range,
  beforeIndex,
}: {
  lines: LyricLine[]
  range: LineRange
  beforeIndex: number
}): { lines: LyricLine[]; newStart: number } {
  const target = Math.min(Math.max(0, beforeIndex), lines.length)
  // Landing anywhere from the block's own start through the slot just after it
  // leaves the order unchanged.
  const isInsideBlock = target >= range.start && target <= range.end + 1
  if (isInsideBlock) return { lines, newStart: range.start }

  const block = lines.slice(range.start, range.end + 1)
  const rest = [...lines.slice(0, range.start), ...lines.slice(range.end + 1)]
  // Everything the block used to occupy is gone, so a destination past it moves up.
  const newStart = target > range.end ? target - block.length : target

  return {
    lines: [...rest.slice(0, newStart), ...block, ...rest.slice(newStart)],
    newStart,
  }
}

/**
 * Nearest line with words in one direction, for the subtitle strip's
 * before/after context. Blank spacers are skipped — they are never sung, so
 * showing one as the next line would be noise. When there is no current line
 * yet (`from` is -1, the playhead sits before every timestamp) the line coming
 * up is the first one actually tagged, and there is nothing behind it.
 */
export function findNeighbourLine({
  lines,
  from,
  step,
}: {
  lines: LyricLine[]
  from: number
  step: number
}): number {
  if (from < 0) {
    if (step < 0) return -1
    return lines.findIndex((line) => line.timeMs !== null && line.text.trim() !== '')
  }

  for (let index = from + step; index >= 0 && index < lines.length; index += step) {
    if (lines[index]?.text.trim() !== '') return index
  }
  return -1
}
