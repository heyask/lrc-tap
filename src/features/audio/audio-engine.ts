import { create } from 'zustand'
import { extrapolateMediaMs } from './media-clock.ts'

type TimeListener = (timeMs: number) => void

type AudioStatus = {
  isReady: boolean
  isPlaying: boolean
  durationMs: number
  playbackRate: number
  volume: number
  /** Set when the browser refuses a file it cannot decode. */
  error: string | null
}

export const useAudioStore = create<AudioStatus>()(() => ({
  isReady: false,
  isPlaying: false,
  durationMs: 0,
  playbackRate: 1,
  volume: 1,
  error: null,
}))

const element = new Audio()
element.preload = 'auto'

const listeners = new Set<TimeListener>()
let objectUrl: string | null = null
let stopAtMs: number | null = null
/** Position to jump to as soon as the browser knows the track's duration. */
let startAtMs = 0
let frame = 0
/** Last moment the media clock actually moved, paired with a performance clock reading. */
let sample: { mediaMs: number; perfMs: number } | null = null

element.addEventListener('loadedmetadata', () => {
  const durationMs = Number.isFinite(element.duration) ? element.duration * 1000 : 0
  useAudioStore.setState({ isReady: true, durationMs, error: null })

  // currentTime is only writable once the duration is known, so a restored
  // position waits here rather than at load time.
  if (startAtMs > 0) element.currentTime = Math.min(startAtMs, durationMs) / 1000
  startAtMs = 0
  emit()
})

element.addEventListener('error', () => {
  useAudioStore.setState({
    isReady: false,
    isPlaying: false,
    error: 'This file could not be decoded. Try MP3, M4A, OGG, WAV or FLAC.',
  })
})

element.addEventListener('play', () => {
  useAudioStore.setState({ isPlaying: true })
  startFrameLoop()
})

element.addEventListener('pause', () => {
  useAudioStore.setState({ isPlaying: false })
  stopFrameLoop()
  emit()
})

element.addEventListener('ended', () => {
  stopAtMs = null
  useAudioStore.setState({ isPlaying: false })
  stopFrameLoop()
  emit()
})

element.addEventListener('seeked', emit)

function emit(): void {
  const timeMs = element.currentTime * 1000

  // Anchor only when the clock has really moved. It does not tick every frame,
  // so re-stamping on each one would make the position look stalled.
  if (sample === null || sample.mediaMs !== timeMs) {
    sample = { mediaMs: timeMs, perfMs: performance.now() }
  }

  for (const listener of listeners) listener(timeMs)
}

function startFrameLoop(): void {
  if (frame !== 0) return
  const tick = (): void => {
    if (stopAtMs !== null && element.currentTime * 1000 >= stopAtMs) {
      stopAtMs = null
      element.pause()
      return
    }
    emit()
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

function stopFrameLoop(): void {
  if (frame === 0) return
  cancelAnimationFrame(frame)
  frame = 0
}

/**
 * The single audio source for the app. Playback position deliberately lives
 * outside React state — it changes every frame, and only `subscribeTime`
 * consumers (the waveform canvas and the clock) need it that often.
 */
export const audioEngine = {
  /** `startAtMs` is where playback should resume — 0 for a freshly opened file. */
  load({ blob, startAtMs: resumeMs }: { blob: Blob; startAtMs: number }): void {
    if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
    objectUrl = URL.createObjectURL(blob)
    stopAtMs = null
    startAtMs = Math.max(0, resumeMs)
    sample = null
    useAudioStore.setState({ isReady: false, isPlaying: false, durationMs: 0, error: null })
    element.src = objectUrl
    element.load()
  },

  play(): void {
    if (!useAudioStore.getState().isReady) return
    void element.play().catch(() => {
      useAudioStore.setState({ isPlaying: false })
    })
  },

  pause(): void {
    stopAtMs = null
    element.pause()
  },

  /** Plays from a point and stops automatically at `untilMs` — used to audition one line. */
  playSegment({ fromMs, untilMs }: { fromMs: number; untilMs: number | null }): void {
    audioEngine.seek({ timeMs: fromMs })
    stopAtMs = untilMs
    audioEngine.play()
  },

  seek({ timeMs }: { timeMs: number }): void {
    const { durationMs, isReady } = useAudioStore.getState()
    if (!isReady) return
    element.currentTime = Math.min(Math.max(0, timeMs), durationMs) / 1000
    emit()
  },

  nudge({ deltaMs }: { deltaMs: number }): void {
    audioEngine.seek({ timeMs: element.currentTime * 1000 + deltaMs })
  },

  setPlaybackRate({ playbackRate }: { playbackRate: number }): void {
    element.playbackRate = playbackRate
    useAudioStore.setState({ playbackRate })
  },

  setVolume({ volume }: { volume: number }): void {
    element.volume = volume
    useAudioStore.setState({ volume })
  },

  getTimeMs(): number {
    return element.currentTime * 1000
  },

  /**
   * Position at the instant something happened, given that event's `timeStamp`.
   * Reading `currentTime` inside a handler is late twice over: the media clock
   * ticks in steps, and a keypress can wait behind a frame of canvas work.
   *
   * `isPlaying` reports whether that position came from a running clock, which
   * is the same thing that decides whether the caller's reading carries human
   * reaction delay.
   */
  getTimeAtMs({ perfMs }: { perfMs: number }): { timeMs: number; isPlaying: boolean } {
    if (element.paused || sample === null) {
      return { timeMs: element.currentTime * 1000, isPlaying: false }
    }

    return {
      timeMs: extrapolateMediaMs({
        sampleMediaMs: sample.mediaMs,
        samplePerfMs: sample.perfMs,
        atPerfMs: perfMs,
        playbackRate: element.playbackRate,
        durationMs: useAudioStore.getState().durationMs,
      }),
      isPlaying: true,
    }
  },

  subscribeTime(listener: TimeListener): () => void {
    listeners.add(listener)
    listener(element.currentTime * 1000)
    return () => {
      listeners.delete(listener)
    }
  },
}
