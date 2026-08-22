import { useSettingsStore } from '../settings/settings-store.ts'
import { useAudioStore } from './audio-engine.ts'
import { planGrain } from './scrub-grain.ts'

/**
 * Dropping grains that would queue past this keeps the sound tied to the hand.
 * Sits above one grain so a slow drag still gets whole slices through, and the
 * queue drains rather than running away.
 */
const MAX_LOOKAHEAD_MS = 250
/** Short ramps on each grain, so slices do not click into each other. */
const FADE_S = 0.005

let context: AudioContext | null = null
let buffer: AudioBuffer | null = null
let playing: AudioBufferSourceNode[] = []
let lastGrainEndMs: number | null = null
let nextStartAt = 0

/** Hands over the mono copy to scrub with; null disables scrubbing. */
export function setScrubBuffer({ buffer: next }: { buffer: AudioBuffer | null }): void {
  buffer = next
  lastGrainEndMs = null
}

export function isScrubAvailable(): boolean {
  return buffer !== null
}

/**
 * Opens a scrub run. Called from a pointer gesture, which is what lets the
 * audio context start without tripping autoplay rules.
 */
export function beginScrub({ timeMs }: { timeMs: number }): void {
  if (buffer === null || !useSettingsStore.getState().scrubAudio) return

  if (context === null) {
    try {
      context = new AudioContext()
    } catch {
      return
    }
  }
  void context.resume().catch(() => undefined)

  lastGrainEndMs = timeMs
  nextStartAt = context.currentTime
}

/**
 * Plays as much audio as the pointer has just travelled over. Opens a run by
 * itself if one is not already going, so hovering can start making sound
 * without the caller tracking whether a run is live.
 */
export function scrubTo({ timeMs }: { timeMs: number }): void {
  if (context === null || lastGrainEndMs === null) {
    beginScrub({ timeMs })
    return
  }
  if (buffer === null) return

  const grain = planGrain({ fromMs: lastGrainEndMs, toMs: timeMs })
  if (grain === null) return
  lastGrainEndMs = timeMs

  const startAt = Math.max(context.currentTime, nextStartAt)
  if (startAt - context.currentTime > MAX_LOOKAHEAD_MS / 1000) return

  const durationS = grain.durationMs / 1000
  const gain = context.createGain()
  const volume = useAudioStore.getState().volume
  gain.gain.setValueAtTime(0, startAt)
  gain.gain.linearRampToValueAtTime(volume, startAt + FADE_S)
  gain.gain.setValueAtTime(volume, startAt + Math.max(FADE_S, durationS - FADE_S))
  gain.gain.linearRampToValueAtTime(0, startAt + durationS)
  gain.connect(context.destination)

  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(gain)
  source.onended = () => {
    playing = playing.filter((node) => node !== source)
    gain.disconnect()
  }
  source.start(startAt, Math.min(grain.startMs / 1000, buffer.duration), durationS)

  playing.push(source)
  nextStartAt = startAt + durationS
}

export function endScrub(): void {
  for (const source of playing) source.stop()
  playing = []
  lastGrainEndMs = null
  nextStartAt = 0
}
