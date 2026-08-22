import { useEffect, useState } from 'react'
import { useEditorStore } from '../editor/editor-store.ts'
import { findActiveIndex } from '../editor/line-operations.ts'
import { audioEngine } from './audio-engine.ts'

/**
 * Playback position, re-rendered at most once per `resolutionMs`. Components
 * that need every frame should draw from `audioEngine.subscribeTime` directly.
 */
export function useCurrentTimeMs({ resolutionMs }: { resolutionMs: number }): number {
  const [timeMs, setTimeMs] = useState(() => audioEngine.getTimeMs())

  useEffect(() => {
    let lastBucket = Number.NaN
    return audioEngine.subscribeTime((nextTimeMs) => {
      const bucket = Math.floor(nextTimeMs / resolutionMs)
      if (bucket === lastBucket) return
      lastBucket = bucket
      setTimeMs(nextTimeMs)
    })
  }, [resolutionMs])

  return timeMs
}

/** Index of the line the playhead is currently inside; -1 before the first timestamp. */
export function useActiveLineIndex(): number {
  const lines = useEditorStore((state) => state.lines)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    return audioEngine.subscribeTime((timeMs) => {
      setActiveIndex(findActiveIndex({ lines, timeMs }))
    })
  }, [lines])

  return activeIndex
}
