import { audioEngine } from '../audio/audio-engine.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { useEditorStore } from './editor-store.ts'

/**
 * Stamps the playhead onto the cursor line and moves on. `atPerfMs` is when
 * the tap actually happened — pass the triggering event's `timeStamp` so a busy
 * frame cannot push the timestamp late. Independent of playback state, so a
 * line can be tagged while paused. Ends a re-sync run once its last line is
 * tagged.
 */
export function tagCursorLine({ atPerfMs }: { atPerfMs: number }): void {
  const { tapOffsetMs } = useSettingsStore.getState()
  const timeMs = Math.max(0, audioEngine.getTimeAtMs({ perfMs: atPerfMs }) - tapOffsetMs)
  const { finishedResync } = useEditorStore.getState().tagCursor({ timeMs })

  if (finishedResync) {
    useEditorStore.getState().endResync()
    audioEngine.pause()
  }
}
