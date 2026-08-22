/** An inclusive line range. Always normalized so start <= end. */
export type LineRange = {
  start: number
  end: number
}

export function createRange({ anchor, head }: { anchor: number; head: number }): LineRange {
  return anchor <= head ? { start: anchor, end: head } : { start: head, end: anchor }
}

export function rangeLength({ range }: { range: LineRange }): number {
  return range.end - range.start + 1
}

export function isInRange({ range, index }: { range: LineRange; index: number }): boolean {
  return index >= range.start && index <= range.end
}
