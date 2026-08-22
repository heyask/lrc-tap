import { audioEngine } from '../audio/audio-engine.ts'
import { useEditorStore } from '../editor/editor-store.ts'
import { parseLrc } from '../lrc/parse-lrc.ts'
import { saveAudio } from '../persistence/session-storage.ts'
import { loadPeaks } from '../waveform/peaks-store.ts'

const LYRICS_EXTENSIONS = ['.lrc', '.txt', '.text']

function isLyricsFile({ file }: { file: File }): boolean {
  const name = file.name.toLowerCase()
  return LYRICS_EXTENSIONS.some((extension) => name.endsWith(extension))
}

function isAudioFile({ file }: { file: File }): boolean {
  return file.type.startsWith('audio/') || file.type.startsWith('video/')
}

export async function adoptAudioFile({ file }: { file: File }): Promise<void> {
  audioEngine.load({ blob: file, startAtMs: 0 })
  useEditorStore.getState().setAudioFileName({ audioFileName: file.name })
  await Promise.all([loadPeaks({ blob: file }), saveAudio({ blob: file, fileName: file.name })])
}

export async function adoptLyricsFile({ file }: { file: File }): Promise<void> {
  adoptLyricsText({ source: await file.text() })
}

export function adoptLyricsText({ source }: { source: string }): void {
  const { lines, metadata } = parseLrc({ source })
  useEditorStore.getState().loadDocument({ lines, metadata })
}

/**
 * Routes a drop by content: audio files go to the player, text files to the
 * lyrics. A file that is neither is reported rather than silently ignored.
 */
export async function adoptDroppedFiles({ files }: { files: File[] }): Promise<string | null> {
  const audio = files.find((file) => isAudioFile({ file }))
  const lyrics = files.find((file) => isLyricsFile({ file }))

  if (audio === undefined && lyrics === undefined) {
    return 'Drop an audio file (MP3, M4A, OGG, WAV, FLAC) or a .lrc / .txt lyrics file.'
  }

  if (lyrics !== undefined) await adoptLyricsFile({ file: lyrics })
  if (audio !== undefined) await adoptAudioFile({ file: audio })
  return null
}
