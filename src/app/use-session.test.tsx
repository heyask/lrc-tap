import { beforeEach, describe, expect, test } from 'bun:test'
import { act, render, waitFor } from '@testing-library/react'
import { resetApp } from '../../test/reset.ts'
import { audioEngine, useAudioStore } from '../features/audio/audio-engine.ts'
import { selectionRange, useEditorStore } from '../features/editor/editor-store.ts'
import { createLyricLine, LyricLine } from '../features/lrc/lyric-line.ts'
import { useSessionAutosave, useSessionRestore, useViewStateAutosave } from './use-session.ts'

const SAVE_SETTLE_MS = 700

function build(entries: [number | null, string][]): LyricLine[] {
  return entries.map(([timeMs, text]) => createLyricLine({ text, timeMs }))
}

/** Stands in for the app: the same three hooks, nothing else. */
function Session() {
  useSessionRestore()
  useSessionAutosave()
  useViewStateAutosave()
  return null
}

const editor = () => useEditorStore.getState()

function readStoredView(): unknown {
  const raw = localStorage.getItem('lrc-tap:view')
  if (raw === null) throw new Error('nothing was written to the view state')
  return JSON.parse(raw)
}
const settle = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)))

/** Works in this session, then lets the debounced writes land. */
async function workThenSave(work: () => void): Promise<void> {
  render(<Session />)
  await settle(50)
  act(work)
  await settle(SAVE_SETTLE_MS)
}

/** Throws away every store and mounts fresh, the way a reload would. */
async function reload(): Promise<void> {
  useEditorStore.getState().loadDocument({ lines: [], metadata: {} })
  render(<Session />)
  await settle(50)
}

describe('session restore', () => {
  beforeEach(async () => {
    await resetApp()
  })

  test('comes back to the line that was being worked on', async () => {
    await workThenSave(() => {
      editor().loadDocument({
        lines: build(Array.from({ length: 40 }, (_, i) => [null, `l${i}`])),
        metadata: {},
      })
      editor().moveCursor({ index: 27, extendSelection: false })
    })

    await reload()
    await waitFor(() => expect(editor().lines).toHaveLength(40))
    expect(editor().cursorIndex).toBe(27)
  })

  test('brings the selected range back with it', async () => {
    await workThenSave(() => {
      editor().loadDocument({
        lines: build(Array.from({ length: 20 }, (_, i) => [null, `l${i}`])),
        metadata: {},
      })
      editor().moveCursor({ index: 5, extendSelection: false })
      editor().moveCursor({ index: 9, extendSelection: true })
    })

    await reload()
    await waitFor(() => expect(editor().lines).toHaveLength(20))
    expect(selectionRange(editor())).toEqual({ start: 5, end: 9 })
  })

  test('moving the cursor alone is enough to be saved', async () => {
    await workThenSave(() => {
      editor().loadDocument({
        lines: build([
          [null, 'a'],
          [null, 'b'],
          [null, 'c'],
        ]),
        metadata: {},
      })
    })
    // A second run that only touches the cursor.
    act(() => editor().moveCursor({ index: 2, extendSelection: false }))
    await settle(SAVE_SETTLE_MS)

    await reload()
    await waitFor(() => expect(editor().lines).toHaveLength(3))
    expect(editor().cursorIndex).toBe(2)
  })

  test('a cursor saved past the end of shorter lyrics does not break the restore', async () => {
    await workThenSave(() => {
      editor().loadDocument({
        lines: build(Array.from({ length: 30 }, (_, i) => [null, `l${i}`])),
        metadata: {},
      })
      editor().moveCursor({ index: 29, extendSelection: false })
    })

    // The lyrics shrink, but the stored cursor still points at line 30.
    act(() => {
      editor().loadDocument({
        lines: build([
          [null, 'a'],
          [null, 'b'],
        ]),
        metadata: {},
      })
      editor().moveCursor({ index: 1, extendSelection: false })
    })
    await settle(SAVE_SETTLE_MS)

    await reload()
    await waitFor(() => expect(editor().lines).toHaveLength(2))
    expect(editor().cursorIndex).toBe(1)
  })
})

describe('playback position', () => {
  beforeEach(async () => {
    await resetApp()
  })

  test('is left alone until a track is actually loaded', async () => {
    localStorage.setItem('lrc-tap:view', JSON.stringify({ playheadMs: 12_345 }))

    render(<Session />)
    await settle(SAVE_SETTLE_MS)

    // Subscribing reports zero straight away; that must not erase the saved spot.
    expect(readStoredView()).toMatchObject({ playheadMs: 12_345 })
  })

  test('follows the playhead once the track is ready', async () => {
    render(<Session />)
    await settle(50)

    act(() => {
      useAudioStore.setState({ isReady: true, durationMs: 60_000 })
      audioEngine.seek({ timeMs: 7500 })
    })
    await settle(SAVE_SETTLE_MS)

    expect(readStoredView()).toMatchObject({ playheadMs: 7500 })
  })
})
