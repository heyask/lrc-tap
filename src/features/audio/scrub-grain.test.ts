import { describe, expect, test } from 'bun:test'
import { planGrain } from './scrub-grain.ts'

describe('planGrain', () => {
  test('stays silent while the pointer is still or barely moving', () => {
    expect(planGrain({ fromMs: 5000, toMs: 5000 })).toBeNull()
    expect(planGrain({ fromMs: 5000, toMs: 5024 })).toBeNull()
    expect(planGrain({ fromMs: 5000, toMs: 4976 })).toBeNull()
  })

  test('a small move still plays long enough to make out', () => {
    expect(planGrain({ fromMs: 5000, toMs: 5040 })).toEqual({ startMs: 5000, durationMs: 180 })
  })

  test('dragging forward replays the stretch just crossed', () => {
    expect(planGrain({ fromMs: 5000, toMs: 5300 })).toEqual({ startMs: 5000, durationMs: 300 })
  })

  test('dragging backwards plays a slice at the new position', () => {
    expect(planGrain({ fromMs: 5000, toMs: 4700 })).toEqual({ startMs: 4700, durationMs: 300 })
  })

  test('a flung drag is cut to the maximum grain', () => {
    expect(planGrain({ fromMs: 1000, toMs: 9000 })).toEqual({ startMs: 1000, durationMs: 400 })
    expect(planGrain({ fromMs: 9000, toMs: 1000 })).toEqual({ startMs: 1000, durationMs: 400 })
  })

  test('never asks for audio before the start of the track', () => {
    const grain = planGrain({ fromMs: 30, toMs: -200 })
    expect(grain?.startMs).toBe(0)
  })
})
