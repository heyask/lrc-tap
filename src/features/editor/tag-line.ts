import { audioEngine } from '../audio/audio-engine.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { useEditorStore } from './editor-store.ts'

/**
 * Stamps the playhead onto the cursor line and moves on. `atPerfMs` is when
 * the tap actually happened — pass the triggering event's `timeStamp` so a busy
 * frame cannot push the timestamp late. Independent of playback state, so a
 * line can be tagged while paused; the tap offset then stays out of it, since
 * a parked playhead carries no reaction delay to cancel. Ends a re-sync run
 * once its last line is tagged.
 */
export function tagCursorLine({ atPerfMs }: { atPerfMs: number }): void {
  const { timeMs: playheadMs, isPlaying } = audioEngine.getTimeAtMs({ perfMs: atPerfMs })
  const tapOffsetMs = isPlaying ? useSettingsStore.getState().tapOffsetMs : 0
  const timeMs = Math.max(0, playheadMs - tapOffsetMs)
  const { finishedResync } = useEditorStore.getState().tagCursor({ timeMs })

  if (finishedResync) {
    useEditorStore.getState().endResync()
    audioEngine.pause()
  }
}
