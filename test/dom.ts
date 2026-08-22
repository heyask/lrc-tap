import { act } from '@testing-library/react'

/**
 * Dispatches a DOM event and lets React settle before the assertion runs.
 * Without the `act` wrapper the state update is queued but not applied, and a
 * test would read the previous render.
 */
export function dispatchAndSettle({ target, event }: { target: EventTarget; event: Event }): void {
  act(() => {
    target.dispatchEvent(event)
  })
}
