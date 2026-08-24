import { beforeEach, describe, expect, test } from 'bun:test'
import { act, render } from '@testing-library/react'
import { resetApp } from '../../test/reset.ts'
import { audioEngine, useAudioStore } from '../features/audio/audio-engine.ts'
import { selectionRange, useEditorStore } from '../features/editor/editor-store.ts'
import { createLyricLine, LyricLine } from '../features/lrc/lyric-line.ts'
import { useGlobalShortcuts } from './global-shortcuts.ts'

function Keyboard() {
  useGlobalShortcuts()
  return <input data-testid="field" />
}

const editor = () => useEditorStore.getState()
const times = () => editor().lines.map((line) => line.timeMs)
const texts = () => editor().lines.map((line) => line.text)

function build(entries: [number | null, string][]): LyricLine[] {
  return entries.map(([timeMs, text]) => createLyricLine({ text, timeMs }))
}

function press({
  code,
  shiftKey = false,
  altKey = false,
  metaKey = false,
  target = window,
}: {
  code: string
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  target?: EventTarget
}): void {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { code, shiftKey, altKey, metaKey, bubbles: true }),
    )
  })
}

describe('the keyboard map', () => {
  beforeEach(async () => {
    await resetApp()
    render(<Keyboard />)
    act(() => {
      editor().loadDocument({
        lines: build([
          [null, 'one'],
          [null, 'two'],
          [null, 'three'],
        ]),
        metadata: {},
      })
      useAudioStore.setState({ isReady: true, durationMs: 60_000 })
      audioEngine.seek({ timeMs: 4000 })
    })
  })

  test('Enter stamps the current line and moves on', () => {
    press({ code: 'Enter' })

    expect(times()[0]).toBeCloseTo(4000, -1)
    expect(editor().cursorIndex).toBe(1)
  })

  test('Space plays and never tags', () => {
    press({ code: 'Space' })
    expect(times()).toEqual([null, null, null])
  })

  test('Enter works while paused, which is the whole point of splitting the two', () => {
    expect(useAudioStore.getState().isPlaying).toBe(false)
    press({ code: 'Enter' })
    expect(times()[0]).not.toBeNull()
  })

  test('arrows move the cursor, shift extends the selection', () => {
    press({ code: 'ArrowDown' })
    expect(editor().cursorIndex).toBe(1)

    press({ code: 'ArrowDown', shiftKey: true })
    expect(selectionRange(editor())).toEqual({ start: 1, end: 2 })
  })

  test('alt-arrows move the lines themselves', () => {
    press({ code: 'ArrowDown', altKey: true })
    expect(texts()).toEqual(['two', 'one', 'three'])
    // The cursor rode along with the line it moved.
    expect(editor().cursorIndex).toBe(1)
  })

  test('a selected block moves as one', () => {
    press({ code: 'ArrowDown', shiftKey: true })
    press({ code: 'ArrowDown', altKey: true })

    expect(texts()).toEqual(['three', 'one', 'two'])
    expect(selectionRange(editor())).toEqual({ start: 1, end: 2 })
  })

  test('brackets nudge by 10ms, with shift and alt for coarser steps', () => {
    act(() => editor().setLineTime({ index: 0, timeMs: 5000 }))

    press({ code: 'BracketRight' })
    expect(times()[0]).toBe(5010)

    press({ code: 'BracketRight', shiftKey: true })
    expect(times()[0]).toBe(5110)

    press({ code: 'BracketRight', altKey: true })
    expect(times()[0]).toBe(5610)

    press({ code: 'BracketLeft' })
    expect(times()[0]).toBe(5600)
  })

  test('Tab skips to the next line still waiting for a timestamp', () => {
    act(() => editor().setLineTime({ index: 1, timeMs: 1000 }))
    press({ code: 'Tab' })
    expect(editor().cursorIndex).toBe(2)
  })

  test('undo walks a tag back', () => {
    press({ code: 'Enter' })
    expect(times()[0]).not.toBeNull()

    press({ code: 'KeyZ', metaKey: true })
    expect(times()[0]).toBeNull()
  })

  test('select-all covers every line', () => {
    press({ code: 'KeyA', metaKey: true })
    expect(selectionRange(editor())).toEqual({ start: 0, end: 2 })
  })

  test('adds an empty line below the cursor', () => {
    press({ code: 'Enter', metaKey: true })

    expect(texts()).toEqual(['one', '', 'two', 'three'])
    expect(editor().cursorIndex).toBe(1)
  })

  test('keeps its hands off while a field has focus', () => {
    const field = document.querySelector('[data-testid="field"]')
    if (field === null) throw new Error('missing field')

    press({ code: 'Enter', target: field })
    press({ code: 'ArrowDown', target: field })

    expect(times()).toEqual([null, null, null])
    expect(editor().cursorIndex).toBe(0)
  })
})
