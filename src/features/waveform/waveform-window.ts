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
