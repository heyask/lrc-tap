import { useEffect, useState } from 'react'
import { useNoticeStore } from '../../app/notice-store.ts'
import { adoptDroppedFiles } from './load-files.ts'

/**
 * Whole-window drop target. Dropping is the fastest way in, so it works
 * anywhere rather than only over a small zone.
 */
export function DropOverlay() {
  const [isDragging, setIsDragging] = useState(false)
  const showNotice = useNoticeStore((state) => state.show)

  useEffect(() => {
    let depth = 0

    function onDragEnter(event: DragEvent): void {
      if (event.dataTransfer === null) return
      depth += 1
      setIsDragging(true)
    }

    function onDragOver(event: DragEvent): void {
      event.preventDefault()
    }

    function onDragLeave(): void {
      depth -= 1
      if (depth <= 0) {
        depth = 0
        setIsDragging(false)
      }
    }

    function onDrop(event: DragEvent): void {
      event.preventDefault()
      depth = 0
      setIsDragging(false)
      if (event.dataTransfer === null) return

      void adoptDroppedFiles({ files: Array.from(event.dataTransfer.files) }).then((error) => {
        if (error !== null) showNotice({ message: error, tone: 'error' })
      })
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [showNotice])

  if (!isDragging) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80">
      <p className="rounded-lg border-2 border-dashed border-teal-500 px-8 py-6 text-lg text-teal-300">
        Drop an audio track or a .lrc / .txt file
      </p>
    </div>
  )
}
