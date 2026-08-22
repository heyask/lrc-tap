import { beforeEach, describe, expect, test } from 'bun:test'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { resetApp } from '../../../test/reset.ts'
import { createLyricLine, LyricLine } from '../lrc/lyric-line.ts'
import { useEditorStore } from './editor-store.ts'
import { LyricList } from './lyric-list.tsx'

const editor = () => useEditorStore.getState()
const times = () => editor().lines.map((line) => line.timeMs)
const texts = () => editor().lines.map((line) => line.text)

function build(entries: [number | null, string][]): LyricLine[] {
  return entries.map(([timeMs, text]) => createLyricLine({ text, timeMs }))
}

function rowAt({ index }: { index: number }): HTMLElement {
  const row = document.querySelector(`[data-line-index="${index}"]`)
  if (!(row instanceof HTMLElement)) throw new Error(`no row ${index}`)
  return row
}

describe('a lyric row', () => {
  beforeEach(async () => {
    await resetApp()
    // Clicking a tagged line would otherwise start an audition we do not need here.
    act(() =>
      editor().loadDocument({
        lines: build([
          [1000, 'first'],
          [2000, 'second'],
          [3000, 'third'],
        ]),
        metadata: {},
      }),
    )
    render(<LyricList />)
  })

  test('clicking it takes the cursor', () => {
    fireEvent.pointerDown(rowAt({ index: 2 }))
    expect(editor().cursorIndex).toBe(2)
  })

  test('shift-clicking stretches the selection to it', () => {
    fireEvent.pointerDown(rowAt({ index: 0 }))
    fireEvent.pointerDown(rowAt({ index: 2 }), { shiftKey: true })

    expect(editor().selectionAnchor).toBe(0)
    expect(editor().cursorIndex).toBe(2)
  })

  test('the timestamp can be typed in directly', () => {
    fireEvent.click(screen.getByText('00:01.00'))
    const field = document.querySelector('input')
    if (field === null) throw new Error('the timestamp field did not open')

    fireEvent.change(field, { target: { value: '00:09.50' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(times()[0]).toBe(9500)
  })

  test('a timestamp that will not parse is held onto rather than guessed at', () => {
    fireEvent.click(screen.getByText('00:01.00'))
    const field = document.querySelector('input')
    if (field === null) throw new Error('the timestamp field did not open')

    fireEvent.change(field, { target: { value: 'half past four' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(document.querySelector('input')).not.toBeNull()
    expect(times()[0]).toBe(1000)
  })

  test('double-clicking opens the words for editing', () => {
    fireEvent.doubleClick(rowAt({ index: 1 }))
    const field = document.querySelector('input')
    if (field === null) throw new Error('the text field did not open')

    fireEvent.change(field, { target: { value: 'rewritten' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(texts()[1]).toBe('rewritten')
    expect(document.querySelector('input')).toBeNull()
  })

  test('escape leaves the words alone', () => {
    fireEvent.doubleClick(rowAt({ index: 1 }))
    const field = document.querySelector('input')
    if (field === null) throw new Error('the text field did not open')

    fireEvent.keyDown(field, { key: 'Escape' })

    expect(texts()[1]).toBe('second')
    expect(document.querySelector('input')).toBeNull()
  })

  test('a drag that did not start on the grip is refused', () => {
    const started = fireEvent.dragStart(rowAt({ index: 0 }), {
      dataTransfer: { setData: () => undefined, effectAllowed: '' },
    })
    // fireEvent returns false when a handler called preventDefault.
    expect(started).toBe(false)
    expect(texts()).toEqual(['first', 'second', 'third'])
  })
})
