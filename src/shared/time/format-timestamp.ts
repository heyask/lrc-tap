const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

/**
 * Formats milliseconds as an LRC timestamp body: `mm:ss.xx`.
 * Minutes are not clamped to two digits; a 100+ minute track widens the field.
 */
export function formatTimestamp({ timeMs }: { timeMs: number }): string {
  const clamped = timeMs < 0 ? 0 : timeMs
  const totalCentiseconds = Math.round(clamped / 10)
  const centiseconds = totalCentiseconds % 100
  const totalSeconds = (totalCentiseconds - centiseconds) / 100
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  const minutes = (totalSeconds - seconds) / SECONDS_PER_MINUTE

  return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`
}

/** Formats milliseconds as `m:ss` for transport read-outs. */
export function formatClock({ timeMs }: { timeMs: number }): string {
  const clamped = timeMs < 0 ? 0 : timeMs
  const totalSeconds = Math.floor(clamped / MS_PER_SECOND)
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  const minutes = (totalSeconds - seconds) / SECONDS_PER_MINUTE

  return `${minutes}:${pad(seconds)}`
}

/** Formats a signed millisecond delta as `+0.10s` / `-1.25s`. */
export function formatDelta({ deltaMs }: { deltaMs: number }): string {
  const sign = deltaMs < 0 ? '-' : '+'
  return `${sign}${(Math.abs(deltaMs) / MS_PER_SECOND).toFixed(2)}s`
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}
