/** Buckets per second of audio. 200 keeps a 5-minute track under half a megabyte. */
const BUCKETS_PER_SECOND = 200
/** Mono at this rate is clear enough to place a lyric by ear, at ~25MB per 5 minutes. */
const SCRUB_SAMPLE_RATE = 22_050

export type Peaks = {
  /** Most negative sample in each bucket, in -1..0. */
  min: Float32Array
  /** Most positive sample in each bucket, in 0..1. */
  max: Float32Array
  bucketsPerSecond: number
  durationMs: number
}

type DecodedAudio = {
  peaks: Peaks
  /** Mono copy used for scrubbing. Null when the browser cannot resample. */
  scrubBuffer: AudioBuffer | null
}

/**
 * Decodes audio once and derives both of the things the editor needs from it:
 * the waveform envelope, and a light mono copy to play while scrubbing. Pass an
 * AbortSignal so a superseded file cannot overwrite newer results.
 */
export async function decodeAudio({
  blob,
  signal,
}: {
  blob: Blob
  signal: AbortSignal
}): Promise<DecodedAudio | null> {
  const arrayBuffer = await blob.arrayBuffer()
  if (signal.aborted) return null

  const context = new OfflineAudioContext(1, 1, 44100)
  const buffer = await context.decodeAudioData(arrayBuffer)
  if (signal.aborted) return null

  const bucketCount = Math.max(1, Math.ceil(buffer.duration * BUCKETS_PER_SECOND))
  const samplesPerBucket = buffer.length / bucketCount
  const min = new Float32Array(bucketCount)
  const max = new Float32Array(bucketCount)
  const channels = Array.from({ length: buffer.numberOfChannels }, (_unused, index) =>
    buffer.getChannelData(index),
  )

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.floor(bucket * samplesPerBucket)
    const end = Math.min(buffer.length, Math.floor((bucket + 1) * samplesPerBucket))
    let bucketMin = 0
    let bucketMax = 0

    // Envelope is the union across channels, not a downmix: a vocal panned hard
    // to one side still shows up as energy.
    for (const channel of channels) {
      for (const value of channel.subarray(start, end)) {
        if (value < bucketMin) bucketMin = value
        if (value > bucketMax) bucketMax = value
      }
    }

    min[bucket] = bucketMin
    max[bucket] = bucketMax
  }

  const scrubBuffer = await renderScrubBuffer({ buffer })
  if (signal.aborted) return null

  return {
    peaks: {
      min,
      max,
      bucketsPerSecond: BUCKETS_PER_SECOND,
      durationMs: buffer.duration * 1000,
    },
    scrubBuffer,
  }
}

/**
 * Renders a mono, downsampled copy for scrub playback. A single output channel
 * lets Web Audio's own mixing rules fold stereo down. Some browsers refuse an
 * arbitrary sample rate — then there is simply no scrub audio, rather than a
 * substitute that would not sound like the track.
 */
async function renderScrubBuffer({ buffer }: { buffer: AudioBuffer }): Promise<AudioBuffer | null> {
  try {
    const frames = Math.ceil(buffer.duration * SCRUB_SAMPLE_RATE)
    const context = new OfflineAudioContext(1, Math.max(1, frames), SCRUB_SAMPLE_RATE)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    source.start()
    return await context.startRendering()
  } catch {
    return null
  }
}
