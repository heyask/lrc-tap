import { describe, expect, test } from 'bun:test'
import { extrapolateMediaMs } from './media-clock.ts'

const base = { sampleMediaMs: 5000, samplePerfMs: 1000, playbackRate: 1, durationMs: 60_000 }

describe('extrapolateMediaMs', () => {
  test('carries the position forward from the last tick', () => {
    expect(extrapolateMediaMs({ ...base, atPerfMs: 1040 })).toBe(5040)
  })

  test('reads back to a moment before the last tick', () => {
    // A keypress can be created before the frame that reported the position.
    expect(extrapolateMediaMs({ ...base, atPerfMs: 990 })).toBe(4990)
  })

  test('scales with the playback rate', () => {
    expect(extrapolateMediaMs({ ...base, atPerfMs: 1100, playbackRate: 0.5 })).toBe(5050)
    expect(extrapolateMediaMs({ ...base, atPerfMs: 1100, playbackRate: 1.5 })).toBe(5150)
  })

  test('never runs past either end of the track', () => {
    expect(extrapolateMediaMs({ ...base, atPerfMs: 999_000 })).toBe(60_000)
    expect(extrapolateMediaMs({ ...base, sampleMediaMs: 10, atPerfMs: 500 })).toBe(0)
  })

  test('leaves the estimate alone while the duration is unknown', () => {
    expect(extrapolateMediaMs({ ...base, atPerfMs: 1040, durationMs: 0 })).toBe(5040)
  })
})
