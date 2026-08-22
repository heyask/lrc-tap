/**
 * Parses an LRC timestamp body (`mm:ss.xx`, `mm:ss.xxx`, `mm:ss`) into milliseconds.
 * Returns null when the text is not a valid timestamp — callers must handle it
 * explicitly rather than substituting a guessed value.
 */
export function parseTimestamp({ text }: { text: string }): number | null {
  const match = /^(\d{1,3}):([0-5]?\d)(?:[.:](\d{1,3}))?$/.exec(text.trim())
  if (match === null) return null

  const [, rawMinutes, rawSeconds, rawFraction] = match
  if (rawMinutes === undefined || rawSeconds === undefined) return null

  const minutes = Number.parseInt(rawMinutes, 10)
  const seconds = Number.parseInt(rawSeconds, 10)
  const fractionMs = rawFraction === undefined ? 0 : fractionToMs(rawFraction)

  return (minutes * 60 + seconds) * 1000 + fractionMs
}

function fractionToMs(fraction: string): number {
  const digits = Number.parseInt(fraction, 10)
  if (fraction.length === 1) return digits * 100
  if (fraction.length === 2) return digits * 10
  return digits
}
