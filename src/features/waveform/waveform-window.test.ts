import { describe, expect, test } from 'bun:test'
import { computeWindow, zoomAroundRatio } from './waveform-window.ts'

const DURATION_MS = 120_000

function zoom({
  startMs,
  endMs,
  ratio,
  nextSpanMs,
}: {
  startMs: number
  endMs: number
  ratio: number
  nextSpanMs: number
}) {
  return computeWindow({
    follow: false,
    playheadMs: 0,
    centerMs: zoomAroundRatio({ startMs, endMs, ratio, nextSpanMs }),
    spanMs: nextSpanMs,
    durationMs: DURATION_MS,
  })
}

/** Where the moment that was under the pointer ends up after the zoom. */
function anchorAfter({
  startMs,
  endMs,
  ratio,
  nextSpanMs,
}: {
  startMs: number
  endMs: number
  ratio: number
  nextSpanMs: number
}): number {
  const zoomed = zoom({ startMs, endMs, ratio, nextSpanMs })
  return zoomed.startMs + ratio * (zoomed.endMs - zoomed.startMs)
}

describe('zoomAroundRatio', () => {
  test('zooming with the pointer in the middle keeps the middle', () => {
    expect(zoom({ startMs: 0, endMs: 20_000, ratio: 0.5, nextSpanMs: 10_000 })).toEqual({
      startMs: 5000,
      endMs: 15_000,
    })
  })

  test('zooming at the left edge keeps that edge in place', () => {
    expect(zoom({ startMs: 0, endMs: 20_000, ratio: 0, nextSpanMs: 10_000 })).toEqual({
      startMs: 0,
      endMs: 10_000,
    })
  })

  test('zooming at the right edge keeps that edge in place', () => {
    expect(zoom({ startMs: 0, endMs: 20_000, ratio: 1, nextSpanMs: 10_000 })).toEqual({
      startMs: 10_000,
      endMs: 20_000,
    })
  })

  test('the pointed-at moment stays under the pointer when zooming in', () => {
    const view = { startMs: 40_000, endMs: 60_000 }
    for (const ratio of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const expected = view.startMs + ratio * (view.endMs - view.startMs)
      expect(anchorAfter({ ...view, ratio, nextSpanMs: 4000 })).toBeCloseTo(expected, 6)
    }
  })

  test('and when zooming out', () => {
    const view = { startMs: 40_000, endMs: 60_000 }
    for (const ratio of [0.2, 0.5, 0.8]) {
      const expected = view.startMs + ratio * (view.endMs - view.startMs)
      expect(anchorAfter({ ...view, ratio, nextSpanMs: 50_000 })).toBeCloseTo(expected, 6)
    }
  })

  test('near the ends of the track the anchor gives way to the clamp', () => {
    // Zooming out at the very start cannot show time before zero, so the view
    // pins to the beginning instead.
    expect(zoom({ startMs: 0, endMs: 20_000, ratio: 0.8, nextSpanMs: 50_000 })).toEqual({
      startMs: 0,
      endMs: 50_000,
    })
  })

  test('a span wider than the track shows the whole thing', () => {
    expect(zoom({ startMs: 0, endMs: 20_000, ratio: 0.5, nextSpanMs: 200_000 })).toEqual({
      startMs: 0,
      endMs: 200_000,
    })
  })
})
