import { formatTimestamp } from '../../shared/time/format-timestamp.ts'
import { EDITABLE_METADATA_KEYS, LrcMetadata, LyricLine } from './lyric-line.ts'

/**
 * Renders lines and metadata as .lrc text. Untagged lines are emitted without a
 * timestamp so a partially synced draft round-trips through save/reload intact.
 */
export function formatLrc({
  lines,
  metadata,
}: {
  lines: LyricLine[]
  metadata: LrcMetadata
}): string {
  const metadataLines = orderedMetadataEntries({ metadata }).map(
    ([key, value]) => `[${key}:${value}]`,
  )
  const lyricLines = lines.map((line) =>
    line.timeMs === null ? line.text : `[${formatTimestamp({ timeMs: line.timeMs })}]${line.text}`,
  )
  const blocks = metadataLines.length === 0 ? lyricLines : [...metadataLines, '', ...lyricLines]

  return `${blocks.join('\n')}\n`
}

/** Editable keys first in panel order, then any tag preserved from the imported file. */
function orderedMetadataEntries({ metadata }: { metadata: LrcMetadata }): [string, string][] {
  const editableKeys: readonly string[] = EDITABLE_METADATA_KEYS.map((field) => field.key)
  const editable = editableKeys.flatMap((key) => {
    const value = metadata[key]
    return value === undefined || value.length === 0 ? [] : [[key, value] as [string, string]]
  })
  const preserved = Object.entries(metadata).filter(
    ([key, value]) => !editableKeys.includes(key) && value.length > 0,
  )

  return [...editable, ...preserved]
}

/** Suggests a file name from metadata, falling back to the audio file's own stem. */
export function suggestFileName({
  metadata,
  audioFileName,
}: {
  metadata: LrcMetadata
  audioFileName: string | null
}): string {
  const title = metadata.ti
  const artist = metadata.ar
  if (title !== undefined && title.length > 0) {
    const prefix = artist !== undefined && artist.length > 0 ? `${artist} - ` : ''
    return `${sanitize(`${prefix}${title}`)}.lrc`
  }
  if (audioFileName !== null && audioFileName.length > 0) {
    return `${sanitize(audioFileName.replace(/\.[^.]+$/, ''))}.lrc`
  }
  return 'lyrics.lrc'
}

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim()
}
