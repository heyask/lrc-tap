import { createStore, del, get, set } from 'idb-keyval'
import { create } from 'zustand'
import { LrcMetadata, LyricLine } from '../lrc/lyric-line.ts'

const store = createStore('lrc-tap', 'session')
const AUDIO_KEY = 'audio'
const DOCUMENT_KEY = 'document'
const SAVE_DEBOUNCE_MS = 500

type StoredAudio = {
  blob: Blob
  fileName: string
}

type StoredDocument = {
  lines: LyricLine[]
  metadata: LrcMetadata
  cursorIndex: number
}

type SessionState = {
  /** Surfaced as a banner: the user must know when their work is not being kept. */
  error: string | null
}

export const useSessionStore = create<SessionState>()(() => ({ error: null }))

let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Queues a document save. Rapid edits collapse into one write. */
export function scheduleDocumentSave({ document }: { document: StoredDocument }): void {
  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void set(DOCUMENT_KEY, document, store).catch(() => {
      useSessionStore.setState({ error: 'Could not save your lyrics for next time.' })
    })
  }, SAVE_DEBOUNCE_MS)
}

export async function saveAudio({ blob, fileName }: StoredAudio): Promise<void> {
  try {
    await set(AUDIO_KEY, { blob, fileName }, store)
    useSessionStore.setState({ error: null })
  } catch {
    useSessionStore.setState({
      error: 'This track is too large to keep for next time — your lyrics are still saved.',
    })
  }
}

export async function readStoredAudio(): Promise<StoredAudio | null> {
  const value: unknown = await get(AUDIO_KEY, store).catch(() => null)
  if (value === null || typeof value !== 'object' || value === undefined) return null
  if (!('blob' in value) || !('fileName' in value)) return null
  if (!(value.blob instanceof Blob) || typeof value.fileName !== 'string') return null
  return { blob: value.blob, fileName: value.fileName }
}

export async function readStoredDocument(): Promise<StoredDocument | null> {
  const value: unknown = await get(DOCUMENT_KEY, store).catch(() => null)
  if (value === null || typeof value !== 'object' || value === undefined) return null
  if (!('lines' in value) || !('metadata' in value) || !('cursorIndex' in value)) return null
  if (!Array.isArray(value.lines) || typeof value.cursorIndex !== 'number') return null
  if (value.metadata === null || typeof value.metadata !== 'object') return null

  const lines = value.lines.filter(isLyricLine)
  if (lines.length !== value.lines.length) return null

  return {
    lines,
    metadata: toMetadata({ value: value.metadata }),
    cursorIndex: value.cursorIndex,
  }
}

export async function clearStoredSession(): Promise<void> {
  if (saveTimer !== null) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  await Promise.all([del(AUDIO_KEY, store), del(DOCUMENT_KEY, store)]).catch(() => undefined)
}

function isLyricLine(value: unknown): value is LyricLine {
  if (value === null || typeof value !== 'object') return false
  if (!('id' in value) || !('text' in value) || !('timeMs' in value)) return false
  if (typeof value.id !== 'string' || typeof value.text !== 'string') return false
  return value.timeMs === null || typeof value.timeMs === 'number'
}

function toMetadata({ value }: { value: object }): LrcMetadata {
  const metadata: LrcMetadata = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') metadata[key] = entry
  }
  return metadata
}
