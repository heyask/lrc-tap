import { useEffect } from 'react'
import { audioEngine } from '../features/audio/audio-engine.ts'
import { selectionRange, useEditorStore } from '../features/editor/editor-store.ts'
import { findNextUntagged } from '../features/editor/line-operations.ts'
import { tagCursorLine } from '../features/editor/tag-line.ts'
import { downloadLrc } from '../features/io/export-lrc.ts'
import { useSettingsStore } from '../features/settings/settings-store.ts'
import { NUDGE_STEP_MS, SEEK_STEP_MS } from '../shared/keyboard/shortcut-map.ts'

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
      audioEngine.toggle()
      return
    }

    case 'Enter': {
      event.preventDefault()
      tagCursorLine()
      return
    }

    case 'Backspace': {
      event.preventDefault()
      const { seekMs } = editor.stepBack()
      if (seekMs !== null) audioEngine.seek({ timeMs: seekMs })
      return
    }

    case 'ArrowUp': {
      event.preventDefault()
      if (event.altKey) {
        editor.moveSelection({ beforeIndex: selectionRange(editor).start - 1 })
        return
      }
      editor.moveCursor({ index: editor.cursorIndex - 1, extendSelection: event.shiftKey })
      return
    }

    case 'ArrowDown': {
      event.preventDefault()
      if (event.altKey) {
        editor.moveSelection({ beforeIndex: selectionRange(editor).end + 2 })
        return
      }
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
      editor.nudgeSelection({ deltaMs: -nudgeStep({ event }) })
      return
    }

    case 'BracketRight': {
      event.preventDefault()
      editor.nudgeSelection({ deltaMs: nudgeStep({ event }) })
      return
    }

    case 'KeyS': {
      event.preventDefault()
      const { skimming, update } = useSettingsStore.getState()
      update({ patch: { skimming: !skimming } })
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

function seekStep({ event }: { event: KeyboardEvent }): number {
  if (event.shiftKey) return SEEK_STEP_MS.fine
  if (event.altKey) return SEEK_STEP_MS.coarse
  return SEEK_STEP_MS.normal
}

function nudgeStep({ event }: { event: KeyboardEvent }): number {
  if (event.shiftKey) return NUDGE_STEP_MS.medium
  if (event.altKey) return NUDGE_STEP_MS.coarse
  return NUDGE_STEP_MS.fine
}

function isTypingTarget({ target }: { target: EventTarget | null }): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}
