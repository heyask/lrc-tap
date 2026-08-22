import { PointerEvent, useCallback, useRef, useState, WheelEvent } from 'react'
import { Button } from '../../shared/ui/button.tsx'
import { audioEngine } from '../audio/audio-engine.ts'
import { Peaks } from '../audio/decode-audio.ts'
import { beginScrub, endScrub, scrubTo } from '../audio/scrub-player.ts'
import { selectionRange, useEditorStore } from '../editor/editor-store.ts'
import { LyricLine } from '../lrc/lyric-line.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { clearSkimmer, skimAt } from './skim-preview.ts'
import { useWaveformViewport } from './use-waveform-viewport.ts'
import { WaveformCanvas } from './waveform-canvas.tsx'

const MARKER_HIT_PX = 6
/** Pointer travel that turns a click into a drag. Below it, a press is a plain seek. */
const DRAG_THRESHOLD_PX = 3

type Drag =
  | { kind: 'marker'; index: number; timeMs: number; originX: number }
  | { kind: 'scrub'; originX: number }
  | { kind: 'pan'; originCenterMs: number; originX: number }

/** The zoomable working surface: scrub, skim, drag markers, and its own controls. */
export function WaveformDetail({
  peaks,
  isDecoding,
  peaksError,
  durationMs,
  lines,
}: {
  peaks: Peaks | null
  isDecoding: boolean
  peaksError: string | null
  durationMs: number
  lines: LyricLine[]
}) {
  const cursorIndex = useEditorStore((state) => state.cursorIndex)
  const selectionAnchor = useEditorStore((state) => state.selectionAnchor)
  const resync = useEditorStore((state) => state.resync)
  const setLineTime = useEditorStore((state) => state.setLineTime)
  const moveCursor = useEditorStore((state) => state.moveCursor)

  const followSetting = useSettingsStore((state) => state.followPlayhead)
  const updateSettings = useSettingsStore((state) => state.update)

  const [drag, setDrag] = useState<Drag | null>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  /** Whether the current press has travelled far enough to be a drag. Not rendered. */
  const hasDragged = useRef(false)

  const viewport = useWaveformViewport({ durationMs, isDragging: drag !== null })

  const ratioAt = useCallback(({ clientX }: { clientX: number }): number => {
    const element = surfaceRef.current
    if (element === null) return 0
    const rect = element.getBoundingClientRect()
    return (clientX - rect.left) / rect.width
  }, [])

  const timeAt = useCallback(
    ({ clientX }: { clientX: number }) => viewport.timeAtRatio({ ratio: ratioAt({ clientX }) }),
    [viewport, ratioAt],
  )

  function markerAt({ clientX }: { clientX: number }): number | null {
    const element = surfaceRef.current
    if (element === null) return null

    const { startMs, endMs } = viewport.windowNow()
    const msPerPixel = (endMs - startMs) / element.getBoundingClientRect().width
    const pointerMs = timeAt({ clientX })

    let best: number | null = null
    let bestDistance = MARKER_HIT_PX * msPerPixel

    lines.forEach((line, index) => {
      if (line.timeMs === null) return
      const distance = Math.abs(line.timeMs - pointerMs)
      if (distance <= bestDistance) {
        bestDistance = distance
        best = index
      }
    })

    return best
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (durationMs === 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    // The playhead itself moves from here on, so the hover marker would only add noise.
    clearSkimmer()

    // Pin the view where it sits without leaving follow mode — a plain click
    // must not turn following off.
    const centerBeforeDrag = viewport.centerNow()
    viewport.freeze()

    hasDragged.current = false
    const base = { originX: event.clientX }

    if (event.button === 1 || event.altKey) {
      setDrag({ kind: 'pan', originCenterMs: centerBeforeDrag, ...base })
      return
    }

    const index = markerAt({ clientX: event.clientX })
    if (index !== null) {
      const timeMs = timeAt({ clientX: event.clientX })
      moveCursor({ index, extendSelection: false })
      setDrag({ kind: 'marker', index, timeMs, ...base })
      audioEngine.seek({ timeMs })
      return
    }

    setDrag({ kind: 'scrub', ...base })
    audioEngine.seek({ timeMs: timeAt({ clientX: event.clientX }) })
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (drag === null) {
      if (durationMs !== 0) skimAt({ timeMs: Math.max(0, timeAt({ clientX: event.clientX })) })
      return
    }

    // A press that has not travelled yet is still a click, so playback is left alone.
    if (!hasDragged.current) {
      if (Math.abs(event.clientX - drag.originX) < DRAG_THRESHOLD_PX) return
      hasDragged.current = true
      // Panning does not move the playhead, so it has no reason to stop the audio.
      if (drag.kind !== 'pan') {
        audioEngine.pause()
        beginScrub({ timeMs: audioEngine.getTimeMs() })
      }
    }

    if (drag.kind === 'pan') {
      const element = surfaceRef.current
      if (element === null) return
      const msPerPixel = viewport.spanMs / element.getBoundingClientRect().width
      viewport.panTo({
        centerMs: drag.originCenterMs - (event.clientX - drag.originX) * msPerPixel,
      })
      return
    }

    const timeMs = Math.max(0, timeAt({ clientX: event.clientX }))
    scrubTo({ timeMs })

    if (drag.kind === 'marker') setDrag({ ...drag, timeMs })
    audioEngine.seek({ timeMs })
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>): void {
    event.currentTarget.releasePointerCapture(event.pointerId)
    hasDragged.current = false
    endScrub()
    if (drag !== null && drag.kind === 'marker') {
      setLineTime({ index: drag.index, timeMs: drag.timeMs })
    }
    setDrag(null)
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>): void {
    if (durationMs === 0) return
    const element = surfaceRef.current
    if (element === null) return

    if (event.ctrlKey || event.metaKey) {
      viewport.zoomAroundPointer({
        ratio: ratioAt({ clientX: event.clientX }),
        zoomingOut: event.deltaY > 0,
      })
      return
    }

    const msPerPixel = viewport.spanMs / element.getBoundingClientRect().width
    const scrolled = event.deltaX !== 0 ? event.deltaX : event.deltaY
    viewport.scrollBy({ deltaMs: scrolled * msPerPixel })
  }

  const highlightRange =
    resync !== null ? resync.range : selectionRange({ cursorIndex, selectionAnchor })

  return (
    <>
      <div
        ref={surfaceRef}
        className="relative h-32 cursor-crosshair touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={clearSkimmer}
        onWheel={handleWheel}
      >
        <WaveformCanvas
          peaks={peaks}
          spanMs={viewport.spanMs}
          centerMs={viewport.centerMs}
          follow={viewport.follow}
          durationMs={durationMs}
          lines={lines}
          cursorIndex={cursorIndex}
          resyncRange={highlightRange}
          dragging={drag !== null && drag.kind === 'marker' ? drag : null}
          showMarkers
          showRuler
        />

        {peaks === null && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-zinc-600">
            {isDecoding
              ? 'Reading waveform…'
              : peaksError !== null
                ? peaksError
                : 'Load a track to see its waveform'}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-zinc-900 px-3 py-1.5">
        <Button
          size="sm"
          variant="ghost"
          title="Show more of the track (Ctrl-scroll on the waveform)"
          onClick={() => viewport.zoomFromButton({ zoomingOut: true })}
        >
          Zoom out
        </Button>
        <Button
          size="sm"
          variant="ghost"
          title="Show less of the track (Ctrl-scroll on the waveform)"
          onClick={() => viewport.zoomFromButton({ zoomingOut: false })}
        >
          Zoom in
        </Button>
        <Button
          size="sm"
          variant={followSetting ? 'primary' : 'ghost'}
          title="Keep the waveform and lyrics centred on the playhead"
          onClick={() => {
            if (followSetting) viewport.freeze()
            updateSettings({ patch: { followPlayhead: !followSetting } })
          }}
        >
          Follow
        </Button>
        <span className="ml-auto text-xs text-zinc-600">
          Drag a marker to move a line · Alt-drag to pan · Ctrl-scroll to zoom
        </span>
      </div>
    </>
  )
}
