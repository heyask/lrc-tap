import { useEffect } from 'react'
import { audioEngine, useAudioStore } from '../features/audio/audio-engine.ts'
import { useEditorStore } from '../features/editor/editor-store.ts'
import {
  readStoredAudio,
  readStoredDocument,
  scheduleDocumentSave,
} from '../features/persistence/session-storage.ts'
import { flushViewState, readViewState, saveViewState } from '../features/persistence/view-state.ts'
import { loadPeaks } from '../features/waveform/peaks-store.ts'

/** Keeps the browser copy of the work in step with the editor. */
export function useSessionAutosave(): void {
  useEffect(() => {
    return useEditorStore.subscribe((state, previous) => {
      const unchanged =
        state.lines === previous.lines &&
        state.metadata === previous.metadata &&
        state.cursorIndex === previous.cursorIndex &&
        state.selectionAnchor === previous.selectionAnchor
      if (unchanged) return

      scheduleDocumentSave({
        document: {
          lines: state.lines,
          metadata: state.metadata,
          cursorIndex: state.cursorIndex,
          selectionAnchor: state.selectionAnchor,
        },
      })
    })
  }, [])
}

/** Remembers where playback had got to, and writes a last time as the tab goes away. */
export function useViewStateAutosave(): void {
  useEffect(() => {
    const unsubscribe = audioEngine.subscribeTime((playheadMs) => {
      // Subscribing reports the current time at once, which is zero before a
      // track is loaded — writing that would erase the position being restored.
      if (!useAudioStore.getState().isReady) return
      saveViewState({ patch: { playheadMs } })
    })
    window.addEventListener('pagehide', flushViewState)

    return () => {
      unsubscribe()
      window.removeEventListener('pagehide', flushViewState)
      flushViewState()
    }
  }, [])
}

/** Brings back the track, the lyrics and the spot that was being worked on. */
export function useSessionRestore(): void {
  useEffect(() => {
    let cancelled = false

    async function restore(): Promise<void> {
      const document = await readStoredDocument()
      if (cancelled) return
      if (document !== null) {
        const editor = useEditorStore.getState()
        editor.loadDocument({ lines: document.lines, metadata: document.metadata })

        // Rebuild the selection through the normal cursor moves, which clamp to
        // the document — a saved index can outlive the lines it pointed at.
        if (document.selectionAnchor !== null) {
          editor.moveCursor({ index: document.selectionAnchor, extendSelection: false })
        }
        editor.moveCursor({
          index: document.cursorIndex,
          extendSelection: document.selectionAnchor !== null,
        })
      }

      const audio = await readStoredAudio()
      if (cancelled || audio === null) return

      const { playheadMs } = readViewState()
      audioEngine.load({ blob: audio.blob, startAtMs: playheadMs === undefined ? 0 : playheadMs })
      useEditorStore.getState().setAudioFileName({ audioFileName: audio.fileName })
      await loadPeaks({ blob: audio.blob })
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])
}
