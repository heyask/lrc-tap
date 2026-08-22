import { clear } from 'idb-keyval'
import { useAudioStore } from '../src/features/audio/audio-engine.ts'
import { useEditorStore } from '../src/features/editor/editor-store.ts'
import { useSettingsStore } from '../src/features/settings/settings-store.ts'
import { usePeaksStore } from '../src/features/waveform/peaks-store.ts'
import { useNoticeStore } from '../src/shared/notice/notice-store.ts'

/**
 * The stores are module singletons, so without this a test inherits whatever
 * the previous one left behind.
 */
export async function resetApp(): Promise<void> {
  useEditorStore.getState().loadDocument({ lines: [], metadata: {}, audioFileName: null })
  useAudioStore.setState({
    isReady: false,
    isPlaying: false,
    durationMs: 0,
    playbackRate: 1,
    volume: 1,
    error: null,
  })
  usePeaksStore.setState({ peaks: null, isDecoding: false, error: null })
  useSettingsStore.setState({
    tapOffsetMs: 0,
    auditionOnSelect: true,
    followPlayhead: true,
    showSubtitleStrip: true,
    scrubAudio: true,
    skimming: true,
  })
  useNoticeStore.getState().clear()

  localStorage.clear()
  await clear().catch(() => undefined)
}

/** Points `prefers-reduced-motion` one way or the other for a test. */
export function setReducedMotion({ reduced }: { reduced: boolean }): void {
  window.matchMedia = (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })
}
