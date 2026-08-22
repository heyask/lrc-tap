/**
 * Playback position at an arbitrary moment, worked out from the last time the
 * media clock ticked. `currentTime` only advances in steps, so reading it
 * straight gives the position at the previous tick rather than right now.
 */
export function extrapolateMediaMs({
  sampleMediaMs,
  samplePerfMs,
  atPerfMs,
  playbackRate,
  durationMs,
}: {
  sampleMediaMs: number
  samplePerfMs: number
  /** A `performance.now()` reading — an event's `timeStamp` shares that clock. */
  atPerfMs: number
  playbackRate: number
  durationMs: number
}): number {
  const estimateMs = sampleMediaMs + (atPerfMs - samplePerfMs) * playbackRate
  const clampedToStart = Math.max(0, estimateMs)

  // Before the duration is known there is nothing to clamp against.
  return durationMs > 0 ? Math.min(clampedToStart, durationMs) : clampedToStart
}
