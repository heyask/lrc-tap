import { describe, expect, test } from 'bun:test'
import { createLyricLine, LyricLine } from '../lrc/lyric-line.ts'
import {
  clearTimes,
  countUntagged,
  findActiveIndex,
  findNeighbourLine,
  findNextTime,
  findNextUntagged,
  findOrderingIssues,
  moveRange,
  removeBlankLines,
  setTime,
  shiftTimes,
  sortTimesAscending,
} from './line-operations.ts'

function build(entries: [number | null, string][]): LyricLine[] {
  return entries.map(([timeMs, text]) => createLyricLine({ text, timeMs }))
}

const times = (lines: LyricLine[]): (number | null)[] => lines.map((line) => line.timeMs)

describe('setTime', () => {
  test('rounds to whole milliseconds and clamps negatives', () => {
    const lines = build([[null, 'a']])
    expect(times(setTime({ lines, index: 0, timeMs: 12.6 }))).toEqual([13])
    expect(times(setTime({ lines, index: 0, timeMs: -50 }))).toEqual([0])
  })

  test('leaves other lines untouched by identity', () => {
    const lines = build([
      [0, 'a'],
      [1000, 'b'],
    ])
    const next = setTime({ lines, index: 0, timeMs: 500 })
    expect(next[1]).toBe(lines[1])
  })
})

describe('shiftTimes', () => {
  test('moves only the range and skips untagged lines', () => {
    const lines = build([
      [1000, 'a'],
      [null, 'b'],
      [3000, 'c'],
      [4000, 'd'],
    ])
    const next = shiftTimes({ lines, range: { start: 1, end: 2 }, deltaMs: -500 })
    expect(times(next)).toEqual([1000, null, 2500, 4000])
  })

  test('clamps at zero rather than going negative', () => {
    const lines = build([[100, 'a']])
    expect(times(shiftTimes({ lines, range: { start: 0, end: 0 }, deltaMs: -5000 }))).toEqual([0])
  })
})

describe('clearTimes', () => {
  test('drops timestamps in the range but keeps the text', () => {
    const lines = build([
      [1000, 'a'],
      [2000, 'b'],
      [3000, 'c'],
    ])
    const next = clearTimes({ lines, range: { start: 0, end: 1 } })
    expect(times(next)).toEqual([null, null, 3000])
    expect(next.map((line) => line.text)).toEqual(['a', 'b', 'c'])
  })
})

describe('sortTimesAscending', () => {
  test('re-deals times into the tagged slots, leaving untagged lines in place', () => {
    const lines = build([
      [3000, 'a'],
      [null, 'b'],
      [1000, 'c'],
    ])
    expect(times(sortTimesAscending({ lines }))).toEqual([1000, null, 3000])
  })
})

describe('findOrderingIssues', () => {
  test('flags a line earlier than the tagged line above it', () => {
    const lines = build([
      [1000, 'a'],
      [500, 'b'],
      [2000, 'c'],
    ])
    expect(findOrderingIssues({ lines })).toEqual([1])
  })

  test('ignores untagged lines between tagged ones', () => {
    const lines = build([
      [1000, 'a'],
      [null, 'b'],
      [2000, 'c'],
    ])
    expect(findOrderingIssues({ lines })).toEqual([])
  })
})

describe('untagged helpers', () => {
  const lines = build([
    [1000, 'a'],
    [null, ''],
    [null, 'c'],
  ])

  test('blank spacers do not count as work left to do', () => {
    expect(countUntagged({ lines })).toBe(1)
    expect(findNextUntagged({ lines, from: 0 })).toBe(2)
    expect(findNextUntagged({ lines, from: 3 })).toBe(-1)
  })
})

describe('removeBlankLines', () => {
  test('drops whitespace-only lines', () => {
    const lines = build([
      [null, 'a'],
      [null, '   '],
      [null, 'b'],
    ])
    expect(removeBlankLines({ lines }).map((line) => line.text)).toEqual(['a', 'b'])
  })
})

describe('findActiveIndex', () => {
  const lines = build([
    [1000, 'a'],
    [2000, 'b'],
    [3000, 'c'],
  ])

  test('returns -1 before the first timestamp', () => {
    expect(findActiveIndex({ lines, timeMs: 0 })).toBe(-1)
  })

  test('holds a line until the next one starts', () => {
    expect(findActiveIndex({ lines, timeMs: 1000 })).toBe(0)
    expect(findActiveIndex({ lines, timeMs: 1999 })).toBe(1 - 1)
    expect(findActiveIndex({ lines, timeMs: 2000 })).toBe(1)
    expect(findActiveIndex({ lines, timeMs: 99_000 })).toBe(2)
  })

  test('prefers the later line when timestamps tie', () => {
    const tied = build([
      [1000, 'a'],
      [1000, 'b'],
    ])
    expect(findActiveIndex({ lines: tied, timeMs: 1500 })).toBe(1)
  })
})

describe('findNextTime', () => {
  test('skips untagged lines to find the end of a span', () => {
    const lines = build([
      [1000, 'a'],
      [null, 'b'],
      [3000, 'c'],
    ])
    expect(findNextTime({ lines, index: 0 })).toBe(3000)
    expect(findNextTime({ lines, index: 2 })).toBeNull()
  })
})

describe('moveRange', () => {
  const abc = build([
    [1000, 'a'],
    [2000, 'b'],
    [3000, 'c'],
  ])
  const texts = (lines: LyricLine[]): string[] => lines.map((line) => line.text)

  test('moves one line up, carrying its timestamp', () => {
    const result = moveRange({ lines: abc, range: { start: 1, end: 1 }, beforeIndex: 0 })
    expect(texts(result.lines)).toEqual(['b', 'a', 'c'])
    expect(times(result.lines)).toEqual([2000, 1000, 3000])
    expect(result.newStart).toBe(0)
  })

  test('moves one line down', () => {
    const result = moveRange({ lines: abc, range: { start: 1, end: 1 }, beforeIndex: 3 })
    expect(texts(result.lines)).toEqual(['a', 'c', 'b'])
    expect(result.newStart).toBe(2)
  })

  test('moves a multi-line block and reports where it landed', () => {
    const lines = build([
      [null, 'a'],
      [null, 'b'],
      [null, 'c'],
      [null, 'd'],
      [null, 'e'],
    ])
    const result = moveRange({ lines, range: { start: 1, end: 2 }, beforeIndex: 4 })
    expect(texts(result.lines)).toEqual(['a', 'd', 'b', 'c', 'e'])
    expect(result.newStart).toBe(2)
  })

  test('moves a block to the very start and to the very end', () => {
    const toStart = moveRange({ lines: abc, range: { start: 2, end: 2 }, beforeIndex: 0 })
    expect(texts(toStart.lines)).toEqual(['c', 'a', 'b'])

    const toEnd = moveRange({ lines: abc, range: { start: 0, end: 0 }, beforeIndex: 99 })
    expect(texts(toEnd.lines)).toEqual(['b', 'c', 'a'])
    expect(toEnd.newStart).toBe(2)
  })

  test('returns the original array when the order would not change', () => {
    for (const beforeIndex of [1, 2]) {
      const result = moveRange({ lines: abc, range: { start: 1, end: 1 }, beforeIndex })
      expect(result.lines).toBe(abc)
      expect(result.newStart).toBe(1)
    }
  })

  test('a drop inside the dragged block is a no-op', () => {
    const result = moveRange({ lines: abc, range: { start: 0, end: 2 }, beforeIndex: 2 })
    expect(result.lines).toBe(abc)
  })
})

describe('findNeighbourLine', () => {
  const lines = build([
    [null, 'intro not tagged'],
    [1000, 'a'],
    [null, ''],
    [2000, 'b'],
  ])

  test('skips blank spacers in both directions', () => {
    expect(findNeighbourLine({ lines, from: 1, step: 1 })).toBe(3)
    expect(findNeighbourLine({ lines, from: 3, step: -1 })).toBe(1)
  })

  test('reports -1 when there is nothing further along', () => {
    expect(findNeighbourLine({ lines, from: 3, step: 1 })).toBe(-1)
    expect(findNeighbourLine({ lines, from: 0, step: -1 })).toBe(-1)
  })

  test('before the first timestamp, the line coming up is the first tagged one', () => {
    expect(findNeighbourLine({ lines, from: -1, step: 1 })).toBe(1)
    expect(findNeighbourLine({ lines, from: -1, step: -1 })).toBe(-1)
  })
})
