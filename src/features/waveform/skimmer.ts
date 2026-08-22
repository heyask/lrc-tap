type SkimmerListener = (timeMs: number | null) => void

const listeners = new Set<SkimmerListener>()
let skimmerMs: number | null = null

/**
 * Where the pointer is hovering over the waveform, or null when it is away.
 * Deliberately outside React state: hovering fires every frame, and only the
 * canvas needs to know — the playhead, the lyric list and the subtitle strip
 * are all unaffected by skimming.
 */
export function setSkimmerMs({ timeMs }: { timeMs: number | null }): void {
  if (skimmerMs === timeMs) return
  skimmerMs = timeMs
  for (const listener of listeners) listener(skimmerMs)
}

export function getSkimmerMs(): number | null {
  return skimmerMs
}

export function subscribeSkimmer(listener: SkimmerListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
