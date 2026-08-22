import { beforeEach, describe, expect, test } from 'bun:test'
import { createLyricLine, LyricLine } from '../lrc/lyric-line.ts'
import { selectionRange, useEditorStore } from './editor-store.ts'

function load(entries: [number | null, string][]): void {
  const lines: LyricLine[] = entries.map(([timeMs, text]) => createLyricLine({ text, timeMs }))
  useEditorStore.getState().loadDocument({ lines, metadata: {} })
}

const times = (): (number | null)[] => useEditorStore.getState().lines.map((line) => line.timeMs)
const cursor = (): number => useEditorStore.getState().cursorIndex

describe('tagCursor', () => {
  beforeEach(() => {
    load([
      [null, 'one'],
      [null, ''],
      [null, 'three'],
    ])
  })

  test('writes the time and advances past blank spacers', () => {
    useEditorStore.getState().tagCursor({ timeMs: 1500 })
    expect(times()).toEqual([1500, null, null])
    expect(cursor()).toBe(2)
  })

  test('stays put on the last line so a trailing tap cannot fall off the end', () => {
    useEditorStore.getState().tagCursor({ timeMs: 1000 })
    useEditorStore.getState().tagCursor({ timeMs: 2000 })
    useEditorStore.getState().tagCursor({ timeMs: 3000 })
    expect(times()).toEqual([1000, null, 3000])
    expect(cursor()).toBe(2)
  })
})

describe('stepBack', () => {
  test('clears the previous tag and reports where to seek', () => {
    load([
      [null, 'one'],
      [null, 'two'],
    ])
    useEditorStore.getState().tagCursor({ timeMs: 1000 })
    const { seekMs } = useEditorStore.getState().stepBack()

    expect(seekMs).toBe(1000)
    expect(times()).toEqual([null, null])
    expect(cursor()).toBe(0)
  })

  test('does nothing at the top of the document', () => {
    load([[null, 'one']])
    expect(useEditorStore.getState().stepBack()).toEqual({ seekMs: null })
  })
})

describe('undo and redo', () => {
  test('walks back one tag at a time and forward again', () => {
    load([
      [null, 'one'],
      [null, 'two'],
    ])
    useEditorStore.getState().tagCursor({ timeMs: 1000 })
    useEditorStore.getState().tagCursor({ timeMs: 2000 })
    expect(times()).toEqual([1000, 2000])

    useEditorStore.getState().undo()
    expect(times()).toEqual([1000, null])

    useEditorStore.getState().undo()
    expect(times()).toEqual([null, null])

    useEditorStore.getState().redo()
    expect(times()).toEqual([1000, null])
  })

  test('collapses consecutive edits to the same line into one step', () => {
    load([[null, 'one']])
    useEditorStore.getState().setLineText({ index: 0, text: 'o' })
    useEditorStore.getState().setLineText({ index: 0, text: 'on' })
    useEditorStore.getState().setLineText({ index: 0, text: 'one!' })

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().lines[0]?.text).toBe('one')
  })

  test('a new edit clears the redo stack', () => {
    load([[null, 'one']])
    useEditorStore.getState().tagCursor({ timeMs: 1000 })
    useEditorStore.getState().undo()
    useEditorStore.getState().tagCursor({ timeMs: 5000 })

    expect(useEditorStore.getState().future).toHaveLength(0)
    expect(times()).toEqual([5000])
  })
})

describe('selection', () => {
  beforeEach(() => {
    load([
      [1000, 'a'],
      [2000, 'b'],
      [3000, 'c'],
      [4000, 'd'],
    ])
  })

  test('extending from the cursor covers both endpoints', () => {
    useEditorStore.getState().moveCursor({ index: 1, extendSelection: false })
    useEditorStore.getState().moveCursor({ index: 2, extendSelection: true })
    expect(selectionRange(useEditorStore.getState())).toEqual({ start: 1, end: 2 })
  })

  test('nudging moves only the selected lines', () => {
    useEditorStore.getState().moveCursor({ index: 1, extendSelection: false })
    useEditorStore.getState().moveCursor({ index: 2, extendSelection: true })
    useEditorStore.getState().nudgeSelection({ deltaMs: 250 })
    expect(times()).toEqual([1000, 2250, 3250, 4000])
  })

  test('with no range, actions apply to the cursor line alone', () => {
    useEditorStore.getState().moveCursor({ index: 3, extendSelection: false })
    useEditorStore.getState().nudgeSelection({ deltaMs: -100 })
    expect(times()).toEqual([1000, 2000, 3000, 3900])
  })

  test('the cursor cannot leave the document', () => {
    useEditorStore.getState().moveCursor({ index: 99, extendSelection: false })
    expect(cursor()).toBe(3)
    useEditorStore.getState().moveCursor({ index: -5, extendSelection: false })
    expect(cursor()).toBe(0)
  })
})

describe('re-sync a range', () => {
  beforeEach(() => {
    load([
      [1000, 'a'],
      [2000, 'b'],
      [3000, 'c'],
      [4000, 'd'],
    ])
  })

  test('clears the range, parks the cursor on it, and leaves the rest alone', () => {
    useEditorStore.getState().beginResync({ range: { start: 1, end: 2 } })
    expect(times()).toEqual([1000, null, null, 4000])
    expect(cursor()).toBe(1)
  })

  test('reports completion when the last line of the range is tagged', () => {
    useEditorStore.getState().beginResync({ range: { start: 1, end: 2 } })
    expect(useEditorStore.getState().tagCursor({ timeMs: 2100 }).finishedResync).toBe(false)
    expect(useEditorStore.getState().tagCursor({ timeMs: 3100 }).finishedResync).toBe(true)
    expect(times()).toEqual([1000, 2100, 3100, 4000])
  })

  test('undo restores the whole range in one step', () => {
    useEditorStore.getState().beginResync({ range: { start: 1, end: 2 } })
    useEditorStore.getState().undo()
    expect(times()).toEqual([1000, 2000, 3000, 4000])
  })
})

describe('moveSelection', () => {
  beforeEach(() => {
    load([
      [1000, 'a'],
      [2000, 'b'],
      [3000, 'c'],
      [4000, 'd'],
    ])
  })

  const texts = (): string[] => useEditorStore.getState().lines.map((line) => line.text)

  test('carries the timestamp with the line', () => {
    useEditorStore.getState().moveCursor({ index: 1, extendSelection: false })
    useEditorStore.getState().moveSelection({ beforeIndex: 4 })

    expect(texts()).toEqual(['a', 'c', 'd', 'b'])
    expect(times()).toEqual([1000, 3000, 4000, 2000])
  })

  test('the cursor follows the line it moved', () => {
    useEditorStore.getState().moveCursor({ index: 2, extendSelection: false })
    useEditorStore.getState().moveSelection({ beforeIndex: 0 })
    expect(cursor()).toBe(0)
  })

  test('a selected block moves together and stays selected', () => {
    useEditorStore.getState().moveCursor({ index: 0, extendSelection: false })
    useEditorStore.getState().moveCursor({ index: 1, extendSelection: true })
    useEditorStore.getState().moveSelection({ beforeIndex: 4 })

    expect(texts()).toEqual(['c', 'd', 'a', 'b'])
    expect(selectionRange(useEditorStore.getState())).toEqual({ start: 2, end: 3 })
  })

  test('undo puts the whole move back in one step', () => {
    useEditorStore.getState().moveCursor({ index: 3, extendSelection: false })
    useEditorStore.getState().moveSelection({ beforeIndex: 0 })
    useEditorStore.getState().undo()

    expect(texts()).toEqual(['a', 'b', 'c', 'd'])
  })

  test('a move that changes nothing leaves no undo step behind', () => {
    useEditorStore.getState().moveCursor({ index: 1, extendSelection: false })
    const historyDepth = useEditorStore.getState().past.length
    useEditorStore.getState().moveSelection({ beforeIndex: 2 })

    expect(useEditorStore.getState().past).toHaveLength(historyDepth)
    expect(texts()).toEqual(['a', 'b', 'c', 'd'])
  })
})
