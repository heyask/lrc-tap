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
    // The audio element outlives resetApp, so a test that left it playing
    // would decide the next one's answer.
    audioEngine.pause()
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

    // Read the playhead at the very instant the tap claims to have happened.
    // Both readings then extrapolate to the same point, so the whole gap
    // between them is the offset rather than however far the clock ran.
    const atPerfMs = performance.now()
    const { timeMs: playheadMs, isPlaying } = audioEngine.getTimeAtMs({ perfMs: atPerfMs })
    expect(isPlaying).toBe(true)

    tagCursorLine({ atPerfMs })

    expect(times()[0]).toBe(Math.round(playheadMs - 200))
  })

  test('is left out of a tap made while paused, where there is no delay to cancel', () => {
    audioEngine.seek({ timeMs: 4000 })
    tagCursorLine({ atPerfMs: performance.now() })

    expect(times()[0]).toBe(4000)
  })
})
