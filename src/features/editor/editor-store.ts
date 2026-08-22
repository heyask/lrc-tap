import { create } from 'zustand'
import { LrcMetadata, LyricLine } from '../lrc/lyric-line.ts'
import { EditorSnapshot, pushHistory } from './editor-snapshot.ts'
import {
  clearTimes,
  insertLineAfter,
  removeBlankLines,
  removeRange,
  setText,
  setTime,
  shiftTimes,
  sortTimesAscending,
} from './line-operations.ts'
import { createRange, LineRange } from './line-range.ts'

/** An in-progress "re-tap just these lines" session. Lines outside the range are never touched. */
type ResyncSession = {
  range: LineRange
}

type EditorState = {
  lines: LyricLine[]
  metadata: LrcMetadata
  audioFileName: string | null
  cursorIndex: number
  /** Set while a range is selected; null means the selection is just the cursor line. */
  selectionAnchor: number | null
  resync: ResyncSession | null
  past: EditorSnapshot[]
  future: EditorSnapshot[]
  lastCoalesceKey: string | null

  loadDocument: (input: {
    lines: LyricLine[]
    metadata: LrcMetadata
    audioFileName?: string | null
  }) => void
  setAudioFileName: (input: { audioFileName: string | null }) => void

  moveCursor: (input: { index: number; extendSelection: boolean }) => void
  collapseSelection: () => void

  tagCursor: (input: { timeMs: number }) => { finishedResync: boolean }
  stepBack: () => { seekMs: number | null }

  setLineTime: (input: { index: number; timeMs: number | null }) => void
  setLineText: (input: { index: number; text: string }) => void
  nudgeSelection: (input: { deltaMs: number }) => void
  clearSelectionTimes: () => void
  deleteSelection: () => void
  insertLineBelowCursor: () => void
  removeBlanks: () => void
  sortTimes: () => void
  setMetadataValue: (input: { key: string; value: string }) => void

  beginResync: (input: { range: LineRange }) => void
  endResync: () => void

  undo: () => void
  redo: () => void
}

const EMPTY_DOCUMENT: EditorSnapshot = { lines: [], metadata: {}, cursorIndex: 0 }

export const useEditorStore = create<EditorState>()((set, get) => {
  /** Captures the current document into the undo stack before a mutation lands. */
  function commit({ coalesceKey }: { coalesceKey: string | null }): Partial<EditorState> {
    const { lines, metadata, cursorIndex, past, lastCoalesceKey } = get()
    return {
      past: pushHistory({
        past,
        snapshot: { lines, metadata, cursorIndex },
        coalesceKey,
        lastCoalesceKey,
      }),
      future: [],
      lastCoalesceKey: coalesceKey,
    }
  }

  function restore({ snapshot }: { snapshot: EditorSnapshot }): Partial<EditorState> {
    return {
      lines: snapshot.lines,
      metadata: snapshot.metadata,
      cursorIndex: snapshot.cursorIndex,
      selectionAnchor: null,
      lastCoalesceKey: null,
    }
  }

  return {
    ...EMPTY_DOCUMENT,
    audioFileName: null,
    selectionAnchor: null,
    resync: null,
    past: [],
    future: [],
    lastCoalesceKey: null,

    loadDocument: ({ lines, metadata, audioFileName }) => {
      set({
        lines,
        metadata,
        cursorIndex: 0,
        selectionAnchor: null,
        resync: null,
        past: [],
        future: [],
        lastCoalesceKey: null,
        ...(audioFileName === undefined ? {} : { audioFileName }),
      })
    },

    setAudioFileName: ({ audioFileName }) => set({ audioFileName }),

    moveCursor: ({ index, extendSelection }) => {
      const { lines, cursorIndex, selectionAnchor } = get()
      if (lines.length === 0) return
      const clamped = Math.min(Math.max(0, index), lines.length - 1)

      set({
        cursorIndex: clamped,
        selectionAnchor: extendSelection
          ? selectionAnchor === null
            ? cursorIndex
            : selectionAnchor
          : null,
      })
    },

    collapseSelection: () => set({ selectionAnchor: null }),

    tagCursor: ({ timeMs }) => {
      const { lines, cursorIndex, resync } = get()
      const line = lines[cursorIndex]
      if (line === undefined) return { finishedResync: false }

      const tagged =
        line.text.trim() === '' ? lines : setTime({ lines, index: cursorIndex, timeMs })
      const nextIndex = nextTaggableIndex({ lines, from: cursorIndex + 1 })
      const finishedResync = resync !== null && cursorIndex >= resync.range.end

      set({
        ...commit({ coalesceKey: null }),
        lines: tagged,
        cursorIndex: nextIndex === -1 ? cursorIndex : nextIndex,
        selectionAnchor: null,
      })

      return { finishedResync }
    },

    stepBack: () => {
      const { lines, cursorIndex } = get()
      const targetIndex = previousTaggableIndex({ lines, from: cursorIndex - 1 })
      if (targetIndex === -1) return { seekMs: null }

      const target = lines[targetIndex]
      if (target === undefined) return { seekMs: null }

      set({
        ...commit({ coalesceKey: null }),
        lines: setTime({ lines, index: targetIndex, timeMs: null }),
        cursorIndex: targetIndex,
        selectionAnchor: null,
      })

      return { seekMs: target.timeMs }
    },

    setLineTime: ({ index, timeMs }) => {
      const { lines } = get()
      set({ ...commit({ coalesceKey: null }), lines: setTime({ lines, index, timeMs }) })
    },

    setLineText: ({ index, text }) => {
      const { lines } = get()
      set({
        ...commit({ coalesceKey: `text:${index}` }),
        lines: setText({ lines, index, text }),
      })
    },

    nudgeSelection: ({ deltaMs }) => {
      const state = get()
      set({
        ...commit({ coalesceKey: null }),
        lines: shiftTimes({ lines: state.lines, range: selectionRange(state), deltaMs }),
      })
    },

    clearSelectionTimes: () => {
      const state = get()
      set({
        ...commit({ coalesceKey: null }),
        lines: clearTimes({ lines: state.lines, range: selectionRange(state) }),
      })
    },

    deleteSelection: () => {
      const state = get()
      const range = selectionRange(state)
      const lines = removeRange({ lines: state.lines, range })
      set({
        ...commit({ coalesceKey: null }),
        lines,
        cursorIndex: Math.min(range.start, Math.max(0, lines.length - 1)),
        selectionAnchor: null,
      })
    },

    insertLineBelowCursor: () => {
      const { lines, cursorIndex } = get()
      set({
        ...commit({ coalesceKey: null }),
        lines: insertLineAfter({ lines, index: cursorIndex, text: '' }),
        cursorIndex: cursorIndex + 1,
        selectionAnchor: null,
      })
    },

    removeBlanks: () => {
      const { lines } = get()
      const next = removeBlankLines({ lines })
      set({
        ...commit({ coalesceKey: null }),
        lines: next,
        cursorIndex: Math.min(get().cursorIndex, Math.max(0, next.length - 1)),
        selectionAnchor: null,
      })
    },

    sortTimes: () => {
      const { lines } = get()
      set({ ...commit({ coalesceKey: null }), lines: sortTimesAscending({ lines }) })
    },

    setMetadataValue: ({ key, value }) => {
      const { metadata } = get()
      set({
        ...commit({ coalesceKey: `meta:${key}` }),
        metadata: { ...metadata, [key]: value },
      })
    },

    beginResync: ({ range }) => {
      const { lines } = get()
      set({
        ...commit({ coalesceKey: null }),
        lines: clearTimes({ lines, range }),
        resync: { range },
        cursorIndex: range.start,
        selectionAnchor: null,
      })
    },

    endResync: () => set({ resync: null }),

    undo: () => {
      const { past, future, lines, metadata, cursorIndex } = get()
      const previous = past[past.length - 1]
      if (previous === undefined) return

      set({
        ...restore({ snapshot: previous }),
        past: past.slice(0, -1),
        future: [...future, { lines, metadata, cursorIndex }],
        resync: null,
      })
    },

    redo: () => {
      const { past, future, lines, metadata, cursorIndex } = get()
      const next = future[future.length - 1]
      if (next === undefined) return

      set({
        ...restore({ snapshot: next }),
        past: [...past, { lines, metadata, cursorIndex }],
        future: future.slice(0, -1),
      })
    },
  }
})

/** The lines an action applies to: the highlighted range, or just the cursor line. */
export function selectionRange(state: {
  cursorIndex: number
  selectionAnchor: number | null
}): LineRange {
  return state.selectionAnchor === null
    ? { start: state.cursorIndex, end: state.cursorIndex }
    : createRange({ anchor: state.selectionAnchor, head: state.cursorIndex })
}

/** Blank spacer lines are never sung, so tapping skips over them in both directions. */
function nextTaggableIndex({ lines, from }: { lines: LyricLine[]; from: number }): number {
  for (let index = from; index < lines.length; index += 1) {
    if (lines[index]?.text.trim() !== '') return index
  }
  return -1
}

function previousTaggableIndex({ lines, from }: { lines: LyricLine[]; from: number }): number {
  for (let index = Math.min(from, lines.length - 1); index >= 0; index -= 1) {
    if (lines[index]?.text.trim() !== '') return index
  }
  return -1
}
