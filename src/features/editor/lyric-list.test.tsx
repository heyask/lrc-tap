import { beforeEach, describe, expect, test } from 'bun:test'
import { act, render } from '@testing-library/react'
import { resetApp, setReducedMotion } from '../../../test/reset.ts'
import { createLyricLine, LyricLine } from '../lrc/lyric-line.ts'
import { useEditorStore } from './editor-store.ts'
import { LyricList } from './lyric-list.tsx'

type ScrollCall = { behavior: string | undefined; block: string | undefined }

let calls: ScrollCall[] = []

function captureScrolls(): void {
  calls = []
  Element.prototype.scrollIntoView = function scrollIntoView(options?: unknown): void {
    if (options === null || typeof options !== 'object') {
      calls.push({ behavior: undefined, block: undefined })
      return
    }
    const behavior = Reflect.get(options, 'behavior')
    const block = Reflect.get(options, 'block')
    calls.push({
      behavior: typeof behavior === 'string' ? behavior : undefined,
      block: typeof block === 'string' ? block : undefined,
    })
  }
}

function build(count: number): LyricLine[] {
  return Array.from({ length: count }, (_unused, index) =>
    createLyricLine({ text: `line ${index}`, timeMs: index * 1000 }),
  )
}

const editor = () => useEditorStore.getState()

describe('following the cursor', () => {
  beforeEach(async () => {
    await resetApp()
    captureScrolls()
    act(() => editor().loadDocument({ lines: build(40), metadata: {} }))
  })

  test('brings the cursor line to the middle when it moves', () => {
    setReducedMotion({ reduced: false })
    render(<LyricList />)
    calls = []

    act(() => editor().moveCursor({ index: 25, extendSelection: false }))

    expect(calls).toHaveLength(1)
    expect(calls[0]?.block).toBe('center')
  })

  test('animates the scroll when motion is welcome', () => {
    setReducedMotion({ reduced: false })
    render(<LyricList />)
    calls = []

    act(() => editor().moveCursor({ index: 12, extendSelection: false }))
    expect(calls[0]?.behavior).toBe('smooth')
  })

  test('jumps instead of animating when reduced motion is asked for', () => {
    // Chrome drops a smooth scroll outright under reduced motion, which left the
    // list stuck at the top instead of following along.
    setReducedMotion({ reduced: true })
    render(<LyricList />)
    calls = []

    act(() => editor().moveCursor({ index: 12, extendSelection: false }))

    expect(calls).toHaveLength(1)
    expect(calls[0]?.behavior).toBe('auto')
  })

  test('renders a row per line', () => {
    setReducedMotion({ reduced: false })
    const { container } = render(<LyricList />)
    expect(container.querySelectorAll('[data-line-index]')).toHaveLength(40)
  })
})
