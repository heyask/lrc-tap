/** Pointer travel below this makes no sound, so a held-still drag stays quiet. */
const MIN_STEP_MS = 25
/**
 * Floor on a slice. Tying length purely to pointer travel makes small moves
 * play a few dozen milliseconds, which lands as a click rather than as music —
 * a slice needs roughly this long before a syllable is recognisable.
 */
const MIN_GRAIN_MS = 180
/** Caps one slice so a flung drag does not leave a long tail playing. */
const MAX_GRAIN_MS = 400

export type Grain = {
  startMs: number
  durationMs: number
}

/**
 * Picks the slice of audio to play for one step of a scrub, the way an NLE
 * does: the further you drag, the further it plays. Dragging forward replays
 * the stretch just crossed so the sound joins up; dragging backwards plays a
 * slice at the new position rather than attempting reverse playback. Returns
 * null when the pointer has barely moved.
 */
export function planGrain({ fromMs, toMs }: { fromMs: number; toMs: number }): Grain | null {
  const travelMs = Math.abs(toMs - fromMs)
  if (travelMs < MIN_STEP_MS) return null

  const durationMs = Math.min(MAX_GRAIN_MS, Math.max(MIN_GRAIN_MS, travelMs))
  const startMs = toMs > fromMs ? fromMs : toMs

  return { startMs: Math.max(0, startMs), durationMs }
}
