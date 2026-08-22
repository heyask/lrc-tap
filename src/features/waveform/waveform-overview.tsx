import { PointerEvent, useRef } from 'react'
import { audioEngine } from '../audio/audio-engine.ts'
import { Peaks } from '../audio/decode-audio.ts'
import { beginScrub, endScrub, scrubTo } from '../audio/scrub-player.ts'
import { useEditorStore } from '../editor/editor-store.ts'
import { LyricLine } from '../lrc/lyric-line.ts'
import { clearSkimmer, skimAt } from './skim-preview.ts'
import { WaveformCanvas } from './waveform-canvas.tsx'

/** The whole track at a glance, doubling as a scrub bar. */
export function WaveformOverview({
  peaks,
  durationMs,
  lines,
  cursorIndex,
}: {
  peaks: Peaks | null
  durationMs: number
  lines: LyricLine[]
  cursorIndex: number
}) {
  const resync = useEditorStore((state) => state.resync)
  const isScrubbing = useRef(false)

  function timeAt(event: PointerEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect()
    return ((event.clientX - rect.left) / rect.width) * durationMs
  }

  function handleDown(event: PointerEvent<HTMLDivElement>): void {
    if (durationMs === 0) return
    isScrubbing.current = false
    endScrub()
    audioEngine.seek({ timeMs: timeAt(event) })
  }

  function handleUp(): void {
    isScrubbing.current = false
    endScrub()
  }

  function handleMove(event: PointerEvent<HTMLDivElement>): void {
    if (durationMs === 0) return

    if (event.buttons === 0) {
      skimAt({ timeMs: timeAt(event) })
      return
    }

    // Dragging across the overview is a scrub, so stop the audio the first time it moves.
    if (!isScrubbing.current) {
      isScrubbing.current = true
      audioEngine.pause()
      beginScrub({ timeMs: audioEngine.getTimeMs() })
    }

    const timeMs = timeAt(event)
    audioEngine.seek({ timeMs })
    scrubTo({ timeMs })
  }

  return (
    <div
      className="h-10 cursor-pointer border-b border-zinc-900"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerLeave={() => {
        handleUp()
        clearSkimmer()
      }}
    >
      <WaveformCanvas
        peaks={peaks}
        spanMs={durationMs}
        centerMs={durationMs / 2}
        follow={false}
        durationMs={durationMs}
        lines={lines}
        cursorIndex={cursorIndex}
        resyncRange={resync === null ? null : resync.range}
        dragging={null}
        showMarkers={false}
        showRuler={false}
      />
    </div>
  )
}
