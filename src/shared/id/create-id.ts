let lastTimestampMs = 0
let sequence = 0

/**
 * UUID v7 — time-ordered, so ids sort by creation and stay stable across
 * serialization. A monotonic counter keeps ids minted within the same
 * millisecond in order.
 */
export function createId(): string {
  const now = Date.now()
  if (now === lastTimestampMs) {
    sequence += 1
  } else {
    lastTimestampMs = now
    sequence = 0
  }

  const timeHex = now.toString(16).padStart(12, '0').slice(-12)
  const versionHex = (0x7000 | (sequence & 0x0fff)).toString(16)
  const tailHex = Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte, index) =>
    // The first tail byte carries the RFC 9562 variant bits (10xxxxxx).
    (index === 0 ? 0x80 | (byte & 0x3f) : byte).toString(16).padStart(2, '0'),
  ).join('')

  return `${timeHex.slice(0, 8)}-${timeHex.slice(8)}-${versionHex}-${tailHex.slice(0, 4)}-${tailHex.slice(4)}`
}
