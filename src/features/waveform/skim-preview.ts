import { useAudioStore } from '../audio/audio-engine.ts'
import { endScrub, scrubTo } from '../audio/scrub-player.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { setSkimmerMs } from './skimmer.ts'

/**
 * Hovering shows where the pointer is and previews the audio there, without
 * touching the playhead. Shared by the overview strip and the detail surface so
 * both behave identically. No React state is involved — the marker lives in
 * `skimmer.ts` and the canvas subscribes to it directly.
 */
export function skimAt({ timeMs }: { timeMs: number }): void {
  if (!useSettingsStore.getState().skimming) return
  setSkimmerMs({ timeMs })

  // While the track is playing the two would talk over each other.
  if (useAudioStore.getState().isPlaying) {
    endScrub()
    return
  }
  scrubTo({ timeMs })
}

export function clearSkimmer(): void {
  endScrub()
  setSkimmerMs({ timeMs: null })
}
