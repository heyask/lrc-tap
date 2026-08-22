import { describe, expect, test } from 'bun:test'
import { planGrain } from './scrub-grain.ts'

describe('planGrain', () => {
  test('stays silent while the pointer is still or barely moving', () => {
    expect(planGrain({ fromMs: 5000, toMs: 5000 })).toBeNull()
    expect(planGrain({ fromMs: 5000, toMs: 5011 })).toBeNull()
    expect(planGrain({ fromMs: 5000, toMs: 4989 })).toBeNull()
  })

  test('dragging forward replays the stretch just crossed', () => {
    expect(planGrain({ fromMs: 5000, toMs: 5080 })).toEqual({ startMs: 5000, durationMs: 80 })
  })

  test('dragging backwards plays a slice at the new position', () => {
    expect(planGrain({ fromMs: 5000, toMs: 4900 })).toEqual({ startMs: 4900, durationMs: 100 })
  })

  test('a flung drag is cut to the maximum grain', () => {
    expect(planGrain({ fromMs: 1000, toMs: 9000 })).toEqual({ startMs: 1000, durationMs: 120 })
    expect(planGrain({ fromMs: 9000, toMs: 1000 })).toEqual({ startMs: 1000, durationMs: 120 })
  })

  test('never asks for audio before the start of the track', () => {
    const grain = planGrain({ fromMs: 30, toMs: -200 })
    expect(grain?.startMs).toBe(0)
  })
})
