import { create } from 'zustand'
import { decodeAudio, Peaks } from '../audio/decode-audio.ts'
import { setScrubBuffer } from '../audio/scrub-player.ts'

type PeaksState = {
  peaks: Peaks | null
  isDecoding: boolean
  error: string | null
}

export const usePeaksStore = create<PeaksState>()(() => ({
  peaks: null,
  isDecoding: false,
  error: null,
}))

let pending: AbortController | null = null

/**
 * Decodes a waveform for the given audio. Any in-flight decode is aborted first,
 * so switching files quickly can never let a stale waveform land last.
 */
export async function loadPeaks({ blob }: { blob: Blob }): Promise<void> {
  pending?.abort()
  const controller = new AbortController()
  pending = controller

  usePeaksStore.setState({ peaks: null, isDecoding: true, error: null })
  setScrubBuffer({ buffer: null })

  try {
    const decoded = await decodeAudio({ blob, signal: controller.signal })
    if (controller.signal.aborted) return
    setScrubBuffer({ buffer: decoded === null ? null : decoded.scrubBuffer })
    usePeaksStore.setState({
      peaks: decoded === null ? null : decoded.peaks,
      isDecoding: false,
      error: null,
    })
  } catch {
    if (controller.signal.aborted) return
    usePeaksStore.setState({
      peaks: null,
      isDecoding: false,
      error: 'Waveform unavailable — this format could not be decoded.',
    })
  } finally {
    if (pending === controller) pending = null
  }
}
