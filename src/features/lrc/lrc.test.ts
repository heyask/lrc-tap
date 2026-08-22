import { describe, expect, test } from 'bun:test'
import { formatTimestamp } from '../../shared/time/format-timestamp.ts'
import { parseTimestamp } from '../../shared/time/parse-timestamp.ts'
import { formatLrc, suggestFileName } from './format-lrc.ts'
import { parseLrc } from './parse-lrc.ts'

describe('parseTimestamp', () => {
  test('reads the standard two-digit fraction', () => {
    expect(parseTimestamp({ text: '00:00.00' })).toBe(0)
    expect(parseTimestamp({ text: '01:23.45' })).toBe(83450)
    expect(parseTimestamp({ text: '10:59.99' })).toBe(659990)
  })

  test('accepts one- and three-digit fractions and a missing fraction', () => {
    expect(parseTimestamp({ text: '00:01.5' })).toBe(1500)
    expect(parseTimestamp({ text: '00:01.005' })).toBe(1005)
    expect(parseTimestamp({ text: '00:07' })).toBe(7000)
  })

  test('accepts the colon fraction separator used by some tools', () => {
    expect(parseTimestamp({ text: '00:01:50' })).toBe(1500)
  })

  test('returns null instead of guessing on malformed input', () => {
    expect(parseTimestamp({ text: '' })).toBeNull()
    expect(parseTimestamp({ text: '1:62.00' })).toBeNull()
    expect(parseTimestamp({ text: 'abc' })).toBeNull()
    expect(parseTimestamp({ text: '00:01.0000' })).toBeNull()
  })
})

describe('formatTimestamp', () => {
  test('pads to mm:ss.xx', () => {
    expect(formatTimestamp({ timeMs: 0 })).toBe('00:00.00')
    expect(formatTimestamp({ timeMs: 83450 })).toBe('01:23.45')
  })

  test('rounds to centiseconds and carries into seconds', () => {
    expect(formatTimestamp({ timeMs: 1996 })).toBe('00:02.00')
    expect(formatTimestamp({ timeMs: 59_999 })).toBe('01:00.00')
  })

  test('clamps negatives to zero', () => {
    expect(formatTimestamp({ timeMs: -500 })).toBe('00:00.00')
  })
})

describe('parseLrc', () => {
  test('separates metadata from timed lines', () => {
    const { lines, metadata, hasTimestamps } = parseLrc({
      source: '[ti:Song]\n[ar:Someone]\n\n[00:01.00]first\n[00:05.50]second\n',
    })

    expect(metadata).toEqual({ ti: 'Song', ar: 'Someone' })
    expect(hasTimestamps).toBe(true)
    expect(lines.map((line) => [line.timeMs, line.text])).toEqual([
      [1000, 'first'],
      [5500, 'second'],
    ])
  })

  test('preserves unknown metadata tags for round-tripping', () => {
    const { metadata } = parseLrc({ source: '[re:some-tool]\n[00:01.00]a\n' })
    expect(metadata.re).toBe('some-tool')
  })

  test('expands multi-timestamp lines in ascending order', () => {
    const { lines } = parseLrc({ source: '[00:30.00][00:10.00]chorus\n' })
    expect(lines.map((line) => [line.timeMs, line.text])).toEqual([
      [10000, 'chorus'],
      [30000, 'chorus'],
    ])
  })

  test('treats untimed text as untagged lines', () => {
    const { lines, hasTimestamps } = parseLrc({ source: 'plain one\nplain two\n' })
    expect(hasTimestamps).toBe(false)
    expect(lines.every((line) => line.timeMs === null)).toBe(true)
  })

  test('handles CRLF and a leading BOM', () => {
    const { lines, metadata } = parseLrc({ source: '﻿[ti:X]\r\n[00:02.00]hello\r\n' })
    expect(metadata.ti).toBe('X')
    expect(lines).toHaveLength(1)
    expect(lines[0]?.timeMs).toBe(2000)
  })

  test('mints a distinct id per line', () => {
    const { lines } = parseLrc({ source: '[00:01.00]a\n[00:02.00]a\n' })
    expect(new Set(lines.map((line) => line.id)).size).toBe(2)
  })
})

describe('parseLrc blank lines', () => {
  test('keeps blank lines between lyrics as spacers', () => {
    const { lines } = parseLrc({ source: 'one\n\ntwo' })
    expect(lines.map((line) => line.text)).toEqual(['one', '', 'two'])
  })

  test('drops the blank lines that pad the start and end of a file', () => {
    const { lines } = parseLrc({ source: '\n\none\ntwo\n\n' })
    expect(lines.map((line) => line.text)).toEqual(['one', 'two'])
  })

  test('keeps a lyric that looks like a tag but is not a known one', () => {
    const { lines, metadata } = parseLrc({ source: '[Chorus: twice]\nsing\n' })
    expect(metadata).toEqual({})
    expect(lines.map((line) => line.text)).toEqual(['[Chorus: twice]', 'sing'])
  })
})

describe('formatLrc', () => {
  test('round-trips a fully tagged file', () => {
    const source = '[ti:Song]\n[ar:Someone]\n\n[00:01.00]first\n[00:05.50]second\n'
    const { lines, metadata } = parseLrc({ source })
    expect(formatLrc({ lines, metadata })).toBe(source)
  })

  test('emits untagged lines without a timestamp', () => {
    const { lines, metadata } = parseLrc({ source: '[00:01.00]first\nnot tagged yet\n' })
    expect(formatLrc({ lines, metadata })).toBe('[00:01.00]first\nnot tagged yet\n')
  })

  test('skips empty metadata values', () => {
    expect(formatLrc({ lines: [], metadata: { ti: '', ar: 'A' } })).toBe('[ar:A]\n\n')
  })
})

describe('suggestFileName', () => {
  test('prefers artist and title', () => {
    expect(suggestFileName({ metadata: { ti: 'Song', ar: 'A' }, audioFileName: 'x.mp3' })).toBe(
      'A - Song.lrc',
    )
  })

  test('falls back to the audio file stem, then a default', () => {
    expect(suggestFileName({ metadata: {}, audioFileName: 'track 01.mp3' })).toBe('track 01.lrc')
    expect(suggestFileName({ metadata: {}, audioFileName: null })).toBe('lyrics.lrc')
  })

  test('strips characters that break file systems', () => {
    expect(suggestFileName({ metadata: { ti: 'a/b:c' }, audioFileName: null })).toBe('a_b_c.lrc')
  })
})
