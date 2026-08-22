import { formatLrc, suggestFileName } from '../lrc/format-lrc.ts'
import { LrcMetadata, LyricLine } from '../lrc/lyric-line.ts'

export function downloadLrc({
  lines,
  metadata,
  audioFileName,
}: {
  lines: LyricLine[]
  metadata: LrcMetadata
  audioFileName: string | null
}): void {
  const blob = new Blob([formatLrc({ lines, metadata })], {
    type: 'text/plain;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = suggestFileName({ metadata, audioFileName })
  anchor.click()

  URL.revokeObjectURL(url)
}

export async function copyLrcToClipboard({
  lines,
  metadata,
}: {
  lines: LyricLine[]
  metadata: LrcMetadata
}): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(formatLrc({ lines, metadata }))
    return true
  } catch {
    return false
  }
}
