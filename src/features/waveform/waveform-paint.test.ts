import { describe, expect, test } from 'bun:test'
import { chooseRulerStepMs } from './waveform-paint.ts'

const WIDTH = 1280

describe('chooseRulerStepMs', () => {
  test('zoomed right in, ticks land every half second', () => {
    expect(chooseRulerStepMs({ spanMs: 2000, width: WIDTH })).toBe(500)
  })

  test('opens the spacing up as more of the track is shown', () => {
    const steps = [5000, 20_000, 60_000, 300_000].map((spanMs) =>
      chooseRulerStepMs({ spanMs, width: WIDTH }),
    )
    // Never narrows as the view widens.
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
  })

  test('every choice leaves labels at least 70px apart', () => {
    for (const spanMs of [1500, 4000, 12_000, 45_000, 200_000, 900_000]) {
      const stepMs = chooseRulerStepMs({ spanMs, width: WIDTH })
      expect((stepMs / spanMs) * WIDTH).toBeGreaterThanOrEqual(70)
    }
  })

  test('a narrow canvas gets coarser ticks than a wide one', () => {
    const narrow = chooseRulerStepMs({ spanMs: 20_000, width: 320 })
    const wide = chooseRulerStepMs({ spanMs: 20_000, width: 1600 })
    expect(narrow).toBeGreaterThan(wide)
  })

  test('falls back to ten minutes when even the widest tick is too tight', () => {
    expect(chooseRulerStepMs({ spanMs: 60_000_000, width: WIDTH })).toBe(600_000)
  })
})
