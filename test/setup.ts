import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { afterEach } from 'bun:test'
import 'fake-indexeddb/auto'

GlobalRegistrator.register()

// Registered once here so every test file unmounts what it rendered; otherwise
// components pile up across tests and queries match the wrong one.
const { cleanup } = await import('@testing-library/react')
afterEach(cleanup)

/**
 * happy-dom stops short of a few things the editor touches. Each stub below is
 * the smallest thing that lets the wiring under test run for real.
 *
 * Web Audio is deliberately absent: scrubbing and decoding create their
 * contexts lazily, so tests that do not scrub never reach them, and a fake
 * context would only prove that the fake works.
 */
if (typeof URL.createObjectURL !== 'function') {
  let handedOut = 0
  URL.createObjectURL = () => `blob:lrc-tap/${(handedOut += 1)}`
  URL.revokeObjectURL = () => undefined
}

if (typeof globalThis.ResizeObserver !== 'function') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

// Needed as a spy target: the list's follow behaviour is defined by how it calls this.
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {}
}
