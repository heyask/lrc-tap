/** Pointer travel below this makes no sound, so a held-still drag stays quiet. */
const MIN_STEP_MS = 12
/** Caps one slice so a flung drag does not leave a long tail playing. */
const MAX_GRAIN_MS = 120

export type Grain = {
  startMs: number
  durationMs: number
}

/**
 * Picks the slice of audio to play for one step of a scrub, the way an NLE
 * does: you hear only as much as you drag. Dragging forward replays the stretch
 * just crossed so the sound joins up; dragging backwards plays a short slice at
 * the new position rather than attempting reverse playback. Returns null when
 * the pointer has barely moved.
 */
export function planGrain({ fromMs, toMs }: { fromMs: number; toMs: number }): Grain | null {
  const travelMs = Math.abs(toMs - fromMs)
  if (travelMs < MIN_STEP_MS) return null

  const durationMs = Math.min(MAX_GRAIN_MS, travelMs)
  const startMs = toMs > fromMs ? fromMs : toMs

  return { startMs: Math.max(0, startMs), durationMs }
}
