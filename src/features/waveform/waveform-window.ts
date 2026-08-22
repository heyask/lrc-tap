type WaveformWindow = {
  startMs: number
  endMs: number
}

/**
 * The slice of the track a canvas shows. While following, the window is derived
 * from the playhead on every frame so scrolling stays smooth without React
 * re-rendering; otherwise it is anchored to the centre the user scrolled to.
 */
export function computeWindow({
  follow,
  playheadMs,
  centerMs,
  spanMs,
  durationMs,
}: {
  follow: boolean
  playheadMs: number
  centerMs: number
  spanMs: number
  durationMs: number
}): WaveformWindow {
  if (durationMs <= 0 || spanMs >= durationMs) {
    return { startMs: 0, endMs: Math.max(spanMs, durationMs) }
  }

  const center = follow ? playheadMs : centerMs
  const start = Math.min(Math.max(0, center - spanMs / 2), durationMs - spanMs)
  return { startMs: start, endMs: start + spanMs }
}

/**
 * Centre that keeps the moment under the pointer pinned to the same pixel
 * across a zoom, so zooming closes in on what you are pointing at instead of
 * dragging it to the middle. `ratio` is the pointer's position across the
 * view: 0 at the left edge, 1 at the right.
 */
export function zoomAroundRatio({
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
  const anchorMs = startMs + ratio * (endMs - startMs)
  return anchorMs + nextSpanMs * (0.5 - ratio)
}
