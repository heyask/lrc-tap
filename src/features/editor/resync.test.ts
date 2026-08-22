import { describe, expect, test } from 'bun:test'
import { createLyricLine, LyricLine } from '../lrc/lyric-line.ts'
import { findResyncStartMs } from './resync.ts'

function build(entries: [number | null, string][]): LyricLine[] {
  return entries.map(([timeMs, text]) => createLyricLine({ text, timeMs }))
}

describe('findResyncStartMs', () => {
  const lines = build([
    [1000, 'a'],
    [null, 'b'],
    [8000, 'c'],
    [9000, 'd'],
  ])

  test('starts a second ahead of the first tagged line in the range', () => {
    expect(findResyncStartMs({ lines, range: { start: 2, end: 3 } })).toBe(7000)
  })

  test('skips untagged lines at the top of the range', () => {
    expect(findResyncStartMs({ lines, range: { start: 1, end: 3 } })).toBe(7000)
  })

  test('gives up when nothing in the range is tagged, leaving the playhead alone', () => {
    expect(findResyncStartMs({ lines, range: { start: 1, end: 1 } })).toBeNull()
  })

  test('never asks to start before the track does', () => {
    const early = build([[300, 'a']])
    expect(findResyncStartMs({ lines: early, range: { start: 0, end: 0 } })).toBe(0)
  })

  test('a line tagged at zero still counts as tagged', () => {
    const atZero = build([[0, 'a']])
    expect(findResyncStartMs({ lines: atZero, range: { start: 0, end: 0 } })).toBe(0)
  })
})
