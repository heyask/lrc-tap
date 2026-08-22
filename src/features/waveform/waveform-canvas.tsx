import { useEffect, useRef } from 'react'
import { audioEngine } from '../audio/audio-engine.ts'
import { Peaks } from '../audio/decode-peaks.ts'
import { LineRange } from '../editor/line-range.ts'
import { LyricLine } from '../lrc/lyric-line.ts'
import { computeWindow } from './waveform-window.ts'

const COLORS = {
  wave: '#3f3f46',
  wavePlayed: '#0f766e',
  marker: '#a1a1aa',
  markerCursor: '#2dd4bf',
  markerLabel: '#d4d4d8',
  playhead: '#fbbf24',
  ruler: '#27272a',
  rulerText: '#52525b',
  resync: 'rgba(45, 212, 191, 0.10)',
  midline: '#27272a',
}

export type WaveformCanvasProps = {
  peaks: Peaks | null
  /** Width of the visible slice. */
  spanMs: number
  /** Centre of the slice while not following the playhead. */
  centerMs: number
  follow: boolean
  durationMs: number
  lines: LyricLine[]
  cursorIndex: number
  resyncRange: LineRange | null
  /** Overrides one line's time while its marker is being dragged. */
  dragging: { index: number; timeMs: number } | null
  showMarkers: boolean
  showRuler: boolean
}

/**
 * Draws the waveform, the line markers and the playhead. The playhead is
 * redrawn from an audio subscription rather than React state so it can move
 * every frame without re-rendering the app.
 */
export function WaveformCanvas(props: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const propsRef = useRef(props)
  propsRef.current = props

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return

    const draw = (timeMs: number): void => {
      const context = canvas.getContext('2d')
      if (context === null) return
      paint({ canvas, context, props: propsRef.current, playheadMs: timeMs })
    }

    const observer = new ResizeObserver(() => {
      draw(audioEngine.getTimeMs())
    })
    observer.observe(canvas)

    const unsubscribe = audioEngine.subscribeTime(draw)
    draw(audioEngine.getTimeMs())

    return () => {
      observer.disconnect()
      unsubscribe()
    }
  }, [])

  // Re-paint when the window, the lines or the drag position change.
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    const context = canvas.getContext('2d')
    if (context === null) return
    paint({ canvas, context, props, playheadMs: audioEngine.getTimeMs() })
  })

  return <canvas ref={canvasRef} className="block h-full w-full" />
}

function paint({
  canvas,
  context,
  props,
  playheadMs,
}: {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  props: WaveformCanvasProps
  playheadMs: number
}): void {
  const ratio = window.devicePixelRatio
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (width === 0 || height === 0) return

  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
  }

  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)

  const { startMs, endMs } = computeWindow({
    follow: props.follow,
    playheadMs,
    centerMs: props.centerMs,
    spanMs: props.spanMs,
    durationMs: props.durationMs,
  })
  const spanMs = endMs - startMs
  if (spanMs <= 0) return
  const toX = (timeMs: number): number => ((timeMs - startMs) / spanMs) * width

  if (props.showRuler) paintRuler({ context, width, height, spanMs, startMs, toX })
  paintResyncBand({ context, props, height, toX })
  paintWave({ context, props, width, height, startMs, spanMs, playheadMs, toX })
  if (props.showMarkers) paintMarkers({ context, props, height, toX })
  paintPlayhead({ context, x: toX(playheadMs), height })
}

function paintWave({
  context,
  props,
  width,
  height,
  startMs,
  spanMs,
  playheadMs,
  toX,
}: {
  context: CanvasRenderingContext2D
  props: WaveformCanvasProps
  width: number
  height: number
  startMs: number
  spanMs: number
  playheadMs: number
  toX: (timeMs: number) => number
}): void {
  const middle = height / 2
  const { peaks } = props

  context.strokeStyle = COLORS.midline
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(0, middle + 0.5)
  context.lineTo(width, middle + 0.5)
  context.stroke()

  if (peaks === null) return

  const msPerPixel = spanMs / width
  const playedX = toX(playheadMs)
  const amplitude = middle - 2

  context.lineWidth = 1
  for (let x = 0; x < width; x += 1) {
    const fromBucket = bucketAt({ peaks, timeMs: startMs + x * msPerPixel })
    const toBucket = bucketAt({ peaks, timeMs: startMs + (x + 1) * msPerPixel })
    const { low, high } = envelope({ peaks, fromBucket, toBucket })
    if (low === 0 && high === 0) continue

    context.strokeStyle = x <= playedX ? COLORS.wavePlayed : COLORS.wave
    context.beginPath()
    context.moveTo(x + 0.5, middle - high * amplitude)
    context.lineTo(x + 0.5, middle - low * amplitude)
    context.stroke()
  }
}

function bucketAt({ peaks, timeMs }: { peaks: Peaks; timeMs: number }): number {
  return Math.floor((timeMs / 1000) * peaks.bucketsPerSecond)
}

function envelope({
  peaks,
  fromBucket,
  toBucket,
}: {
  peaks: Peaks
  fromBucket: number
  toBucket: number
}): { low: number; high: number } {
  const start = Math.max(0, fromBucket)
  const end = Math.min(peaks.min.length, Math.max(start + 1, toBucket))
  if (start >= peaks.min.length) return { low: 0, high: 0 }

  let low = 0
  let high = 0
  for (const value of peaks.min.subarray(start, end)) if (value < low) low = value
  for (const value of peaks.max.subarray(start, end)) if (value > high) high = value
  return { low, high }
}

function paintRuler({
  context,
  width,
  height,
  spanMs,
  startMs,
  toX,
}: {
  context: CanvasRenderingContext2D
  width: number
  height: number
  spanMs: number
  startMs: number
  toX: (timeMs: number) => number
}): void {
  const stepMs = chooseRulerStepMs({ spanMs, width })
  const firstTick = Math.ceil(startMs / stepMs) * stepMs

  context.font = '10px ui-monospace, SFMono-Regular, monospace'
  context.textBaseline = 'top'

  for (let tick = firstTick; tick < startMs + spanMs; tick += stepMs) {
    const x = Math.round(toX(tick)) + 0.5
    context.strokeStyle = COLORS.ruler
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, height)
    context.stroke()

    context.fillStyle = COLORS.rulerText
    context.fillText(rulerLabel({ timeMs: tick }), x + 3, 2)
  }
}

function chooseRulerStepMs({ spanMs, width }: { spanMs: number; width: number }): number {
  const candidates = [500, 1000, 2000, 5000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000]
  const minimumSpacingPx = 70
  for (const candidate of candidates) {
    if ((candidate / spanMs) * width >= minimumSpacingPx) return candidate
  }
  return 600_000
}

function rulerLabel({ timeMs }: { timeMs: number }): string {
  const totalSeconds = Math.round(timeMs / 1000)
  const seconds = totalSeconds % 60
  const minutes = (totalSeconds - seconds) / 60
  return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`
}

function paintResyncBand({
  context,
  props,
  height,
  toX,
}: {
  context: CanvasRenderingContext2D
  props: WaveformCanvasProps
  height: number
  toX: (timeMs: number) => number
}): void {
  const { resyncRange, lines } = props
  if (resyncRange === null) return

  const startTime = lines[resyncRange.start]?.timeMs
  const endTime = lines[resyncRange.end]?.timeMs
  if (startTime === undefined || startTime === null) return

  const from = toX(startTime)
  const to = endTime === undefined || endTime === null ? from + 4 : toX(endTime)
  context.fillStyle = COLORS.resync
  context.fillRect(from, 0, Math.max(2, to - from), height)
}

function paintMarkers({
  context,
  props,
  height,
  toX,
}: {
  context: CanvasRenderingContext2D
  props: WaveformCanvasProps
  height: number
  toX: (timeMs: number) => number
}): void {
  context.font = '10px ui-monospace, SFMono-Regular, monospace'
  context.textBaseline = 'bottom'

  props.lines.forEach((line, index) => {
    const timeMs =
      props.dragging !== null && props.dragging.index === index
        ? props.dragging.timeMs
        : line.timeMs
    if (timeMs === null) return

    const x = toX(timeMs)
    if (x < -20 || x > context.canvas.clientWidth + 20) return

    const isCursor = index === props.cursorIndex
    context.strokeStyle = isCursor ? COLORS.markerCursor : COLORS.marker
    context.lineWidth = isCursor ? 2 : 1
    context.beginPath()
    context.moveTo(Math.round(x) + 0.5, 0)
    context.lineTo(Math.round(x) + 0.5, height)
    context.stroke()

    context.fillStyle = isCursor ? COLORS.markerCursor : COLORS.markerLabel
    context.fillText(String(index + 1), Math.round(x) + 3, height - 2)
  })
}

function paintPlayhead({
  context,
  x,
  height,
}: {
  context: CanvasRenderingContext2D
  x: number
  height: number
}): void {
  const position = Math.round(x) + 0.5
  context.strokeStyle = COLORS.playhead
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(position, 0)
  context.lineTo(position, height)
  context.stroke()

  context.fillStyle = COLORS.playhead
  context.beginPath()
  context.moveTo(position - 4, 0)
  context.lineTo(position + 4, 0)
  context.lineTo(position, 6)
  context.closePath()
  context.fill()
}
