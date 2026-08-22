import { useCallback, useEffect, useState } from 'react'
import { audioEngine } from '../audio/audio-engine.ts'
import { readViewState, saveViewState } from '../persistence/view-state.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { computeWindow, zoomAroundRatio } from './waveform-window.ts'

const DEFAULT_SPAN_MS = 20_000
const MIN_SPAN_MS = 1500
const MAX_SPAN_MS = 600_000
const BUTTON_ZOOM_FACTOR = 1.6
const WHEEL_ZOOM_IN_FACTOR = 0.8
const WHEEL_ZOOM_OUT_FACTOR = 1.25

type WaveformViewport = {
  spanMs: number
  /** True while the view rides along with the playhead. */
  follow: boolean
  /** The slice of the track on screen right now. */
  windowNow: () => { startMs: number; endMs: number }
  /** Track position under a point across the view, 0 at the left edge. */
  timeAtRatio: (input: { ratio: number }) => number
  zoomAroundPointer: (input: { ratio: number; zoomingOut: boolean }) => void
  zoomFromButton: (input: { zoomingOut: boolean }) => void
  scrollBy: (input: { deltaMs: number }) => void
  panTo: (input: { centerMs: number }) => void
  /** Centre the view is sitting at, for a gesture that needs a starting point. */
  centerNow: () => number
  /** Pins the view where it is, so leaving follow mode never jumps. */
  freeze: () => void
  centerMs: number
}

/**
 * Owns which slice of the track the detail view shows: how wide, centred where,
 * and whether it rides along with the playhead. `isDragging` comes from the
 * caller because a drag suspends following, and the drag itself is a gesture
 * concern that belongs with the surface handling it.
 */
export function useWaveformViewport({
  durationMs,
  isDragging,
}: {
  durationMs: number
  isDragging: boolean
}): WaveformViewport {
  const followSetting = useSettingsStore((state) => state.followPlayhead)
  const updateSettings = useSettingsStore((state) => state.update)

  const [spanMs, setSpanMs] = useState(() => {
    const stored = readViewState().spanMs
    return stored === undefined ? DEFAULT_SPAN_MS : clampSpan({ spanMs: stored })
  })
  const [centerMs, setCenterMs] = useState(() => {
    const stored = readViewState().centerMs
    return stored === undefined ? 0 : stored
  })

  const follow = followSetting && !isDragging

  useEffect(() => {
    saveViewState({ patch: { spanMs, centerMs } })
  }, [spanMs, centerMs])

  const windowNow = useCallback(() => {
    return computeWindow({
      follow,
      playheadMs: audioEngine.getTimeMs(),
      centerMs,
      spanMs,
      durationMs,
    })
  }, [follow, centerMs, spanMs, durationMs])

  const centerNow = useCallback(() => {
    const { startMs, endMs } = windowNow()
    return (startMs + endMs) / 2
  }, [windowNow])

  const timeAtRatio = useCallback(
    ({ ratio }: { ratio: number }) => {
      const { startMs, endMs } = windowNow()
      return startMs + ratio * (endMs - startMs)
    },
    [windowNow],
  )

  const releaseFollow = useCallback(() => {
    updateSettings({ patch: { followPlayhead: false } })
  }, [updateSettings])

  return {
    spanMs,
    centerMs,
    follow,
    windowNow,
    centerNow,
    timeAtRatio,

    zoomAroundPointer: ({ ratio, zoomingOut }) => {
      const { startMs, endMs } = windowNow()
      const nextSpanMs = clampSpan({
        spanMs: spanMs * (zoomingOut ? WHEEL_ZOOM_OUT_FACTOR : WHEEL_ZOOM_IN_FACTOR),
      })

      setSpanMs(nextSpanMs)
      setCenterMs(zoomAroundRatio({ startMs, endMs, ratio, nextSpanMs }))
      releaseFollow()
    },

    zoomFromButton: ({ zoomingOut }) => {
      setSpanMs(
        clampSpan({
          spanMs: zoomingOut ? spanMs * BUTTON_ZOOM_FACTOR : spanMs / BUTTON_ZOOM_FACTOR,
        }),
      )
    },

    scrollBy: ({ deltaMs }) => {
      setCenterMs(centerNow() + deltaMs)
      releaseFollow()
    },

    panTo: ({ centerMs: next }) => {
      setCenterMs(next)
      releaseFollow()
    },

    freeze: () => setCenterMs(centerNow()),
  }
}

function clampSpan({ spanMs }: { spanMs: number }): number {
  return Math.min(MAX_SPAN_MS, Math.max(MIN_SPAN_MS, spanMs))
}
