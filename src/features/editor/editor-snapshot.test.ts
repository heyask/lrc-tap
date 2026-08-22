import { describe, expect, test } from 'bun:test'
import { EditorSnapshot, pushHistory } from './editor-snapshot.ts'

const snapshot = (cursorIndex: number): EditorSnapshot => ({
  lines: [],
  metadata: {},
  cursorIndex,
})

describe('pushHistory', () => {
  test('adds a step when nothing is being coalesced', () => {
    const past = pushHistory({
      past: [],
      snapshot: snapshot(1),
      coalesceKey: null,
      lastCoalesceKey: null,
    })
    expect(past).toHaveLength(1)
  })

  test('folds a repeat of the same edit into the step already there', () => {
    const first = pushHistory({
      past: [],
      snapshot: snapshot(1),
      coalesceKey: 'text:3',
      lastCoalesceKey: null,
    })
    const second = pushHistory({
      past: first,
      snapshot: snapshot(2),
      coalesceKey: 'text:3',
      lastCoalesceKey: 'text:3',
    })

    expect(second).toBe(first)
  })

  test('a different line starts its own step', () => {
    const first = pushHistory({
      past: [],
      snapshot: snapshot(1),
      coalesceKey: 'text:3',
      lastCoalesceKey: null,
    })
    const second = pushHistory({
      past: first,
      snapshot: snapshot(2),
      coalesceKey: 'text:4',
      lastCoalesceKey: 'text:3',
    })

    expect(second).toHaveLength(2)
  })

  test('two uncoalescable edits never merge, even back to back', () => {
    const first = pushHistory({
      past: [],
      snapshot: snapshot(1),
      coalesceKey: null,
      lastCoalesceKey: null,
    })
    const second = pushHistory({
      past: first,
      snapshot: snapshot(2),
      coalesceKey: null,
      lastCoalesceKey: null,
    })

    expect(second).toHaveLength(2)
  })

  test('drops the oldest steps once the stack is full', () => {
    let past: EditorSnapshot[] = []
    for (let step = 0; step < 620; step += 1) {
      past = pushHistory({
        past,
        snapshot: snapshot(step),
        coalesceKey: null,
        lastCoalesceKey: null,
      })
    }

    expect(past).toHaveLength(500)
    // The window slid forward: the earliest steps are gone, the newest kept.
    expect(past[0]?.cursorIndex).toBe(120)
    expect(past[past.length - 1]?.cursorIndex).toBe(619)
  })
})
