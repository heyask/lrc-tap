import { useEffect, useRef } from 'react'
import { audioEngine } from '../audio/audio-engine.ts'
import { subscribeSkimmer } from './skimmer.ts'
import { paint, WaveformCanvasProps } from './waveform-paint.ts'

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

    const unsubscribeTime = audioEngine.subscribeTime(draw)
    const unsubscribeSkimmer = subscribeSkimmer(() => {
      draw(audioEngine.getTimeMs())
    })
    draw(audioEngine.getTimeMs())

    return () => {
      observer.disconnect()
      unsubscribeTime()
      unsubscribeSkimmer()
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
