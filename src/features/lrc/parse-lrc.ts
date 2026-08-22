import { parseTimestamp } from '../../shared/time/parse-timestamp.ts'
import { createLyricLine, isKnownMetadataTag, LrcMetadata, LyricLine } from './lyric-line.ts'

const TIMESTAMP_PREFIX = /^\[(\d{1,3}:[0-5]?\d(?:[.:]\d{1,3})?)\]/
const METADATA_PREFIX = /^\[([a-zA-Z]+):(.*)\]$/

type ParsedLrc = {
  lines: LyricLine[]
  metadata: LrcMetadata
  /** True when at least one line carried a timestamp — i.e. the input was an .lrc, not plain text. */
  hasTimestamps: boolean
}

/**
 * Parses .lrc or plain lyrics text. Document order is preserved: a line that
 * carries several timestamps expands into adjacent copies in ascending order,
 * and nothing is re-sorted. Re-ordering is an explicit user action.
 */
export function parseLrc({ source }: { source: string }): ParsedLrc {
  const lines: LyricLine[] = []
  const metadata: LrcMetadata = {}
  let hasTimestamps = false

  for (const rawLine of splitLines(source)) {
    const trimmed = rawLine.trim()

    const metadataMatch = METADATA_PREFIX.exec(trimmed)
    if (metadataMatch !== null) {
      const [, rawKey, value] = metadataMatch
      if (rawKey !== undefined && value !== undefined && isKnownMetadataTag(rawKey.toLowerCase())) {
        metadata[rawKey.toLowerCase()] = value.trim()
        continue
      }
    }

    const { timestampsMs, text } = splitTimestamps(trimmed)
    if (timestampsMs.length === 0) {
      lines.push(createLyricLine({ text: trimmed, timeMs: null }))
      continue
    }

    hasTimestamps = true
    for (const timeMs of [...timestampsMs].sort((a, b) => a - b)) {
      lines.push(createLyricLine({ text, timeMs }))
    }
  }

  return { lines: trimBlankEdges(lines), metadata, hasTimestamps }
}

function splitLines(source: string): string[] {
  return source.replace(/^﻿/, '').split(/\r\n|\r|\n/)
}

/**
 * Blank lines that pad the start or end of a file are structure, not content:
 * the separator under the metadata block and the trailing newline. Blank lines
 * between lyrics are kept as spacers.
 */
function trimBlankEdges(lines: LyricLine[]): LyricLine[] {
  const isBlank = (line: LyricLine): boolean => line.timeMs === null && line.text === ''

  let start = 0
  while (start < lines.length) {
    const line = lines[start]
    if (line === undefined || !isBlank(line)) break
    start += 1
  }

  let end = lines.length
  while (end > start) {
    const line = lines[end - 1]
    if (line === undefined || !isBlank(line)) break
    end -= 1
  }

  return lines.slice(start, end)
}

function splitTimestamps(line: string): { timestampsMs: number[]; text: string } {
  const timestampsMs: number[] = []
  let rest = line

  while (true) {
    const match = TIMESTAMP_PREFIX.exec(rest)
    if (match === null) break

    const [matched, body] = match
    if (body === undefined) break

    const timeMs = parseTimestamp({ text: body })
    if (timeMs === null) break

    timestampsMs.push(timeMs)
    rest = rest.slice(matched.length)
  }

  return { timestampsMs, text: rest.trim() }
}
