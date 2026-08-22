import { PointerEvent, useCallback, useEffect, useRef, useState, WheelEvent } from 'react'
import { Button } from '../../shared/ui/button.tsx'
import { audioEngine, useAudioStore } from '../audio/audio-engine.ts'
import { beginScrub, endScrub, scrubTo } from '../audio/scrub-player.ts'
import { selectionRange, useEditorStore } from '../editor/editor-store.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { usePeaksStore } from './peaks-store.ts'
import { setSkimmerMs } from './skimmer.ts'
import { WaveformCanvas } from './waveform-canvas.tsx'
import { computeWindow } from './waveform-window.ts'

const MARKER_HIT_PX = 6
/** Pointer travel that turns a click into a drag. Below it, a press is a plain seek. */
const DRAG_THRESHOLD_PX = 3
const MIN_SPAN_MS = 1500
const MAX_SPAN_MS = 600_000

type Drag =
  | { kind: 'marker'; index: number; timeMs: number; originX: number }
  | { kind: 'scrub'; originX: number }
  | { kind: 'pan'; originCenterMs: number; originX: number }

export function WaveformView() {
  const peaks = usePeaksStore((state) => state.peaks)
  const isDecoding = usePeaksStore((state) => state.isDecoding)
  const peaksError = usePeaksStore((state) => state.error)
  const durationMs = useAudioStore((state) => state.durationMs)

  const lines = useEditorStore((state) => state.lines)
  const cursorIndex = useEditorStore((state) => state.cursorIndex)
  const selectionAnchor = useEditorStore((state) => state.selectionAnchor)
  const resync = useEditorStore((state) => state.resync)
  const setLineTime = useEditorStore((state) => state.setLineTime)
  const moveCursor = useEditorStore((state) => state.moveCursor)

  const followSetting = useSettingsStore((state) => state.followPlayhead)
  const skimmingEnabled = useSettingsStore((state) => state.skimming)
  const updateSettings = useSettingsStore((state) => state.update)

  const [spanMs, setSpanMs] = useState(20_000)
  const [centerMs, setCenterMs] = useState(0)
  const [drag, setDrag] = useState<Drag | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const overviewScrubbing = useRef(false)
  /** Whether the current press has travelled far enough to be a drag. Not rendered. */
  const hasDragged = useRef(false)

  const follow = followSetting && drag === null

  // Turning skimming off from the key or the checkbox should drop any line already drawn.
  useEffect(() => {
    if (skimmingEnabled) return
    endScrub()
    setSkimmerMs({ timeMs: null })
  }, [skimmingEnabled])

  const currentWindow = useCallback((): { startMs: number; endMs: number } => {
    return computeWindow({
      follow,
      playheadMs: audioEngine.getTimeMs(),
      centerMs,
      spanMs,
      durationMs,
    })
  }, [follow, centerMs, spanMs, durationMs])

  const timeAt = useCallback(
    ({ clientX }: { clientX: number }): number => {
      const element = detailRef.current
      if (element === null) return 0
      const rect = element.getBoundingClientRect()
      const { startMs, endMs } = currentWindow()
      const ratio = (clientX - rect.left) / rect.width
      return startMs + ratio * (endMs - startMs)
    },
    [currentWindow],
  )

  const markerAt = useCallback(
    ({ clientX }: { clientX: number }): number | null => {
      const element = detailRef.current
      if (element === null) return null
      const rect = element.getBoundingClientRect()
      const { startMs, endMs } = currentWindow()
      const msPerPixel = (endMs - startMs) / rect.width

      let best: number | null = null
      let bestDistance = MARKER_HIT_PX * msPerPixel
      const pointerMs = timeAt({ clientX })

      lines.forEach((line, index) => {
        if (line.timeMs === null) return
        const distance = Math.abs(line.timeMs - pointerMs)
        if (distance <= bestDistance) {
          bestDistance = distance
          best = index
        }
      })

      return best
    },
    [currentWindow, lines, timeAt],
  )

  /** Freezes the view where it currently sits, so leaving follow mode never jumps. */
  const anchorCenter = useCallback((): void => {
    const { startMs, endMs } = currentWindow()
    setCenterMs((startMs + endMs) / 2)
  }, [currentWindow])

  /**
   * Hovering shows where the pointer is and previews the audio there, without
   * touching the playhead. Silent while the track is playing so the two do not
   * talk over each other.
   */
  function skimAt({ timeMs }: { timeMs: number }): void {
    if (!useSettingsStore.getState().skimming) return
    setSkimmerMs({ timeMs })

    // While the track is playing the two would talk over each other.
    if (useAudioStore.getState().isPlaying) {
      endScrub()
      return
    }
    scrubTo({ timeMs })
  }

  function clearSkimmer(): void {
    endScrub()
    setSkimmerMs({ timeMs: null })
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (durationMs === 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    // The playhead itself moves from here on, so the hover marker would only add noise.
    clearSkimmer()

    const { startMs, endMs } = currentWindow()
    const centerBeforeDrag = (startMs + endMs) / 2
    setCenterMs(centerBeforeDrag)

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
      const element = detailRef.current
      if (element === null) return
      const msPerPixel = spanMs / element.getBoundingClientRect().width
      setCenterMs(drag.originCenterMs - (event.clientX - drag.originX) * msPerPixel)
      updateSettings({ patch: { followPlayhead: false } })
      return
    }

    const timeMs = Math.max(0, timeAt({ clientX: event.clientX }))
    scrubTo({ timeMs })

    if (drag.kind === 'marker') {
      setDrag({ ...drag, timeMs })
      audioEngine.seek({ timeMs })
      return
    }

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

    if (event.ctrlKey || event.metaKey) {
      const anchorMs = timeAt({ clientX: event.clientX })
      const nextSpan = clampSpan({ spanMs: spanMs * (event.deltaY > 0 ? 1.25 : 0.8) })
      setSpanMs(nextSpan)
      setCenterMs(anchorMs)
      updateSettings({ patch: { followPlayhead: false } })
      return
    }

    const element = detailRef.current
    if (element === null) return
    const msPerPixel = spanMs / element.getBoundingClientRect().width
    const delta = (event.deltaX !== 0 ? event.deltaX : event.deltaY) * msPerPixel
    const { startMs, endMs } = currentWindow()
    setCenterMs((startMs + endMs) / 2 + delta)
    updateSettings({ patch: { followPlayhead: false } })
  }

  function overviewTime(event: PointerEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect()
    return ((event.clientX - rect.left) / rect.width) * durationMs
  }

  function seekFromOverview(event: PointerEvent<HTMLDivElement>): void {
    audioEngine.seek({ timeMs: overviewTime(event) })
  }

  function handleOverviewDown(event: PointerEvent<HTMLDivElement>): void {
    if (durationMs === 0) return
    overviewScrubbing.current = false
    endScrub()
    seekFromOverview(event)
  }

  function handleOverviewUp(): void {
    overviewScrubbing.current = false
    endScrub()
  }

  function handleOverviewMove(event: PointerEvent<HTMLDivElement>): void {
    if (durationMs === 0) return
    if (event.buttons === 0) {
      skimAt({ timeMs: overviewTime(event) })
      return
    }
    // Dragging across the overview is a scrub, so stop the audio the first time it moves.
    if (!overviewScrubbing.current) {
      overviewScrubbing.current = true
      audioEngine.pause()
      beginScrub({ timeMs: audioEngine.getTimeMs() })
    }
    seekFromOverview(event)
    scrubTo({ timeMs: overviewTime(event) })
  }

  const highlightRange =
    resync !== null ? resync.range : selectionRange({ cursorIndex, selectionAnchor })

  return (
    <div className="border-t border-zinc-800 bg-zinc-950">
      <div
        className="h-10 cursor-pointer border-b border-zinc-900"
        onPointerDown={handleOverviewDown}
        onPointerMove={handleOverviewMove}
        onPointerUp={handleOverviewUp}
        onPointerCancel={handleOverviewUp}
        onPointerLeave={() => {
          handleOverviewUp()
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

      <div
        ref={detailRef}
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
          spanMs={spanMs}
          centerMs={centerMs}
          follow={follow}
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
          onClick={() => setSpanMs(clampSpan({ spanMs: spanMs * 1.6 }))}
        >
          Zoom out
        </Button>
        <Button
          size="sm"
          variant="ghost"
          title="Show less of the track (Ctrl-scroll on the waveform)"
          onClick={() => setSpanMs(clampSpan({ spanMs: spanMs / 1.6 }))}
        >
          Zoom in
        </Button>
        <Button
          size="sm"
          variant={followSetting ? 'primary' : 'ghost'}
          title="Keep the waveform and lyrics centred on the playhead"
          onClick={() => {
            if (followSetting) anchorCenter()
            updateSettings({ patch: { followPlayhead: !followSetting } })
          }}
        >
          Follow
        </Button>
        <span className="ml-auto text-xs text-zinc-600">
          Drag a marker to move a line · Alt-drag to pan · Ctrl-scroll to zoom
        </span>
      </div>
    </div>
  )
}

function clampSpan({ spanMs }: { spanMs: number }): number {
  return Math.min(MAX_SPAN_MS, Math.max(MIN_SPAN_MS, spanMs))
}
