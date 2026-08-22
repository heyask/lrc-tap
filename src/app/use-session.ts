import { useEffect } from 'react'
import { audioEngine } from '../features/audio/audio-engine.ts'
import { useEditorStore } from '../features/editor/editor-store.ts'
import {
  readStoredAudio,
  readStoredDocument,
  scheduleDocumentSave,
} from '../features/persistence/session-storage.ts'
import { loadPeaks } from '../features/waveform/peaks-store.ts'

/** Keeps the browser copy of the work in step with the editor. */
export function useSessionAutosave(): void {
  useEffect(() => {
    return useEditorStore.subscribe((state, previous) => {
      if (state.lines === previous.lines && state.metadata === previous.metadata) return
      scheduleDocumentSave({
        document: {
          lines: state.lines,
          metadata: state.metadata,
          cursorIndex: state.cursorIndex,
        },
      })
    })
  }, [])
}

/** Brings back the track and lyrics from the previous visit. */
export function useSessionRestore(): void {
  useEffect(() => {
    let cancelled = false

    async function restore(): Promise<void> {
      const document = await readStoredDocument()
      if (cancelled) return
      if (document !== null) {
        useEditorStore.getState().loadDocument({
          lines: document.lines,
          metadata: document.metadata,
        })
      }

      const audio = await readStoredAudio()
      if (cancelled || audio === null) return

      audioEngine.load({ blob: audio.blob })
      useEditorStore.getState().setAudioFileName({ audioFileName: audio.fileName })
      await loadPeaks({ blob: audio.blob })
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])
}
