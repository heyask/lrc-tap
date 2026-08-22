import { createId } from '../../shared/id/create-id.ts'

export type LyricLine = {
  id: string
  text: string
  /** null means "not tagged yet" — kept distinct from 0ms. */
  timeMs: number | null
}

/**
 * Tags exposed as editable fields in the metadata panel, in display and export order.
 * Any other tag found while parsing is preserved verbatim and re-emitted after these.
 */
export const EDITABLE_METADATA_KEYS = [
  { key: 'ti', label: 'Title' },
  { key: 'ar', label: 'Artist' },
  { key: 'al', label: 'Album' },
  { key: 'by', label: 'Tagged by' },
  { key: 'offset', label: 'Offset (ms)' },
] as const

export type LrcMetadata = Record<string, string>

/**
 * Tags recognised as metadata. Kept a closed set so a lyric line that happens to
 * look like a tag — `[Chorus: repeat]` — stays a lyric instead of vanishing.
 */
const KNOWN_METADATA_TAGS: readonly string[] = [
  'ti',
  'ar',
  'al',
  'au',
  'by',
  'offset',
  're',
  've',
  'length',
  'tool',
  'encoding',
  'la',
  'lr',
]

export function isKnownMetadataTag(tag: string): boolean {
  return KNOWN_METADATA_TAGS.includes(tag)
}

export function createLyricLine({
  text,
  timeMs,
}: {
  text: string
  timeMs: number | null
}): LyricLine {
  return { id: createId(), text, timeMs }
}
