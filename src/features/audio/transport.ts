import { getSkimmerMs } from '../waveform/skimmer.ts'
import { audioEngine, useAudioStore } from './audio-engine.ts'
import { endScrub } from './scrub-player.ts'

/**
 * Starting playback while the pointer is skimming the waveform picks up from
 * the skimmer rather than the playhead — the point of hovering is to say "here",
 * so pressing play should honour it without a click first. With the pointer
 * away from the waveform there is no skimmer and playback resumes as usual.
 */
export function togglePlayback(): void {
  if (useAudioStore.getState().isPlaying) {
    audioEngine.pause()
    return
  }

  const skimmerMs = getSkimmerMs()
  if (skimmerMs !== null) audioEngine.seek({ timeMs: skimmerMs })

  endScrub()
  audioEngine.play()
}
