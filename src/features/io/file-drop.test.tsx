import { beforeEach, describe, expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { dispatchAndSettle } from '../../../test/dom.ts'
import { resetApp } from '../../../test/reset.ts'
import { DropOverlay } from './file-drop.tsx'

const PROMPT = /Drop an audio track/

/** happy-dom has no DataTransfer, and only `types` matters to the overlay. */
function dragEvent({ type, types }: { type: string; types: string[] }): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: { types, files: [] } })
  return event
}

const overlayShown = (): boolean => screen.queryByText(PROMPT) !== null

describe('DropOverlay', () => {
  beforeEach(async () => {
    await resetApp()
    render(<DropOverlay />)
  })

  test('stays out of the way while a lyric line is being dragged', () => {
    dispatchAndSettle({
      target: window,
      event: dragEvent({ type: 'dragenter', types: ['text/plain'] }),
    })
    expect(overlayShown()).toBe(false)
  })

  test('a dropped lyric line is not mistaken for a file', () => {
    dispatchAndSettle({
      target: window,
      event: dragEvent({ type: 'dragenter', types: ['text/plain'] }),
    })
    const drop = dragEvent({ type: 'drop', types: ['text/plain'] })
    window.dispatchEvent(drop)

    // Left unclaimed, so the row that started the drag handles it.
    expect(drop.defaultPrevented).toBe(false)
    expect(overlayShown()).toBe(false)
  })

  test('invites the drop when files are on the way', () => {
    dispatchAndSettle({ target: window, event: dragEvent({ type: 'dragenter', types: ['Files'] }) })
    expect(overlayShown()).toBe(true)
  })

  test('gets out of the way once the files leave', () => {
    dispatchAndSettle({ target: window, event: dragEvent({ type: 'dragenter', types: ['Files'] }) })
    dispatchAndSettle({ target: window, event: dragEvent({ type: 'dragleave', types: ['Files'] }) })
    expect(overlayShown()).toBe(false)
  })

  test('survives dragging in and out repeatedly', () => {
    for (let pass = 0; pass < 4; pass += 1) {
      dispatchAndSettle({
        target: window,
        event: dragEvent({ type: 'dragenter', types: ['Files'] }),
      })
      dispatchAndSettle({
        target: window,
        event: dragEvent({ type: 'dragleave', types: ['Files'] }),
      })
    }
    expect(overlayShown()).toBe(false)

    dispatchAndSettle({ target: window, event: dragEvent({ type: 'dragenter', types: ['Files'] }) })
    expect(overlayShown()).toBe(true)
  })

  test('nested enters need as many leaves before it hides', () => {
    dispatchAndSettle({ target: window, event: dragEvent({ type: 'dragenter', types: ['Files'] }) })
    dispatchAndSettle({ target: window, event: dragEvent({ type: 'dragenter', types: ['Files'] }) })
    dispatchAndSettle({ target: window, event: dragEvent({ type: 'dragleave', types: ['Files'] }) })

    expect(overlayShown()).toBe(true)
  })
})
