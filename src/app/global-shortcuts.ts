import { useEffect } from 'react'
import { audioEngine, useAudioStore } from '../features/audio/audio-engine.ts'
import { useEditorStore } from '../features/editor/editor-store.ts'
import { findNextUntagged } from '../features/editor/line-operations.ts'
import { downloadLrc } from '../features/io/export-lrc.ts'
import { useSettingsStore } from '../features/settings/settings-store.ts'

const SEEK_STEP_MS = 3000
const SEEK_STEP_FINE_MS = 1000
const SEEK_STEP_COARSE_MS = 10_000
const NUDGE_FINE_MS = 10
const NUDGE_COARSE_MS = 100

/**
 * The app's single keyboard map. Keys are matched on `event.code` so the layout
 * of the user's keyboard does not change where the shortcuts sit.
 */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}

function handleKeyDown(event: KeyboardEvent): void {
  if (isTypingTarget({ target: event.target })) return

  const editor = useEditorStore.getState()
  const modifier = event.metaKey || event.ctrlKey

  if (modifier && event.code === 'KeyZ') {
    event.preventDefault()
    if (event.shiftKey) editor.redo()
    else editor.undo()
    return
  }

  if (modifier && event.code === 'KeyY') {
    event.preventDefault()
    editor.redo()
    return
  }

  if (modifier && event.code === 'KeyS') {
    event.preventDefault()
    downloadLrc({
      lines: editor.lines,
      metadata: editor.metadata,
      audioFileName: editor.audioFileName,
    })
    return
  }

  if (modifier && event.code === 'KeyA') {
    event.preventDefault()
    if (editor.lines.length === 0) return
    editor.moveCursor({ index: 0, extendSelection: false })
    editor.moveCursor({ index: editor.lines.length - 1, extendSelection: true })
    return
  }

  if (modifier) return

  switch (event.code) {
    case 'Space': {
      event.preventDefault()
      if (!useAudioStore.getState().isPlaying) {
        audioEngine.play()
        return
      }
      tapCurrentLine()
      return
    }

    case 'Enter': {
      event.preventDefault()
      tapCurrentLine()
      return
    }

    case 'Backspace': {
      event.preventDefault()
      const { seekMs } = editor.stepBack()
      if (seekMs !== null) audioEngine.seek({ timeMs: seekMs })
      return
    }

    case 'KeyP':
    case 'KeyK': {
      event.preventDefault()
      audioEngine.toggle()
      return
    }

    case 'ArrowUp': {
      event.preventDefault()
      editor.moveCursor({ index: editor.cursorIndex - 1, extendSelection: event.shiftKey })
      return
    }

    case 'ArrowDown': {
      event.preventDefault()
      editor.moveCursor({ index: editor.cursorIndex + 1, extendSelection: event.shiftKey })
      return
    }

    case 'ArrowLeft': {
      event.preventDefault()
      audioEngine.nudge({ deltaMs: -seekStep({ event }) })
      return
    }

    case 'ArrowRight': {
      event.preventDefault()
      audioEngine.nudge({ deltaMs: seekStep({ event }) })
      return
    }

    case 'BracketLeft': {
      event.preventDefault()
      editor.nudgeSelection({ deltaMs: event.shiftKey ? -NUDGE_COARSE_MS : -NUDGE_FINE_MS })
      return
    }

    case 'BracketRight': {
      event.preventDefault()
      editor.nudgeSelection({ deltaMs: event.shiftKey ? NUDGE_COARSE_MS : NUDGE_FINE_MS })
      return
    }

    case 'Tab': {
      event.preventDefault()
      const next = findNextUntagged({ lines: editor.lines, from: editor.cursorIndex + 1 })
      if (next !== -1) editor.moveCursor({ index: next, extendSelection: false })
      return
    }

    case 'Home': {
      event.preventDefault()
      editor.moveCursor({ index: 0, extendSelection: event.shiftKey })
      return
    }

    case 'End': {
      event.preventDefault()
      editor.moveCursor({ index: editor.lines.length - 1, extendSelection: event.shiftKey })
      return
    }

    case 'Escape': {
      event.preventDefault()
      if (editor.resync !== null) editor.endResync()
      else if (editor.selectionAnchor !== null) editor.collapseSelection()
      audioEngine.pause()
      return
    }

    default:
      return
  }
}

function tapCurrentLine(): void {
  const { tapOffsetMs } = useSettingsStore.getState()
  const timeMs = Math.max(0, audioEngine.getTimeMs() - tapOffsetMs)
  const { finishedResync } = useEditorStore.getState().tagCursor({ timeMs })

  if (finishedResync) {
    useEditorStore.getState().endResync()
    audioEngine.pause()
  }
}

function seekStep({ event }: { event: KeyboardEvent }): number {
  if (event.shiftKey) return SEEK_STEP_FINE_MS
  if (event.altKey) return SEEK_STEP_COARSE_MS
  return SEEK_STEP_MS
}

function isTypingTarget({ target }: { target: EventTarget | null }): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}
