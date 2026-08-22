import { describe, expect, test } from 'bun:test'
import { createLyricLine, LyricLine } from '../lrc/lyric-line.ts'
import {
  clearTimes,
  countUntagged,
  findActiveIndex,
  findNextTime,
  findNextUntagged,
  findOrderingIssues,
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
