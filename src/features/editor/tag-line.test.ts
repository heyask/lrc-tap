import { beforeEach, describe, expect, test } from 'bun:test'
import { resetApp } from '../../../test/reset.ts'
import { audioEngine, useAudioStore } from '../audio/audio-engine.ts'
import { createLyricLine } from '../lrc/lyric-line.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { useEditorStore } from './editor-store.ts'
import { tagCursorLine } from './tag-line.ts'

const times = () => useEditorStore.getState().lines.map((line) => line.timeMs)

describe('the tap offset', () => {
  beforeEach(async () => {
    await resetApp()
    useEditorStore.getState().loadDocument({
      lines: [createLyricLine({ text: 'one', timeMs: null })],
      metadata: {},
      audioFileName: null,
    })
    useAudioStore.setState({ isReady: true, durationMs: 60_000 })
    useSettingsStore.setState({ tapOffsetMs: 200 })
  })

  test('comes off a tap made while the audio plays', () => {
    audioEngine.play()
    audioEngine.seek({ timeMs: 4000 })

    // Tapping the instant the clock was sampled leaves nothing to extrapolate,
    // so whatever is missing from 4000 is the offset and only the offset.
    tagCursorLine({ atPerfMs: performance.now() })

    expect(times()[0]).toBeCloseTo(3800, -1)
    audioEngine.pause()
  })

  test('is left out of a tap made while paused, where there is no delay to cancel', () => {
    audioEngine.seek({ timeMs: 4000 })
    tagCursorLine({ atPerfMs: performance.now() })

    expect(times()[0]).toBe(4000)
  })
})
