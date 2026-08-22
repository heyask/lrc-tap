/** Buckets per second of audio. 200 keeps a 5-minute track under half a megabyte. */
const BUCKETS_PER_SECOND = 200

export type Peaks = {
  /** Most negative sample in each bucket, in -1..0. */
  min: Float32Array
  /** Most positive sample in each bucket, in 0..1. */
  max: Float32Array
  bucketsPerSecond: number
  durationMs: number
}

/**
 * Decodes audio and reduces it to per-bucket min/max envelopes for the waveform.
 * Pass an AbortSignal so a superseded file cannot overwrite a newer waveform.
 */
export async function decodePeaks({
  blob,
  signal,
}: {
  blob: Blob
  signal: AbortSignal
}): Promise<Peaks | null> {
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

  return {
    min,
    max,
    bucketsPerSecond: BUCKETS_PER_SECOND,
    durationMs: buffer.duration * 1000,
  }
}
