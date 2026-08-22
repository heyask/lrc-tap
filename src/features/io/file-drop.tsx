import { useEffect, useState } from 'react'
import { useNoticeStore } from '../../shared/notice/notice-store.ts'
import { adoptDroppedFiles } from './load-files.ts'

/**
 * A drag only counts here if it is carrying files from outside. Reordering a
 * lyric line is a drag too, and without this the whole window would light up as
 * a file target every time one is moved.
 *
 * `types` rather than `files`: browsers withhold the file list until the drop
 * itself, but the types are readable for the whole drag.
 */
function carriesFiles({ event }: { event: DragEvent }): boolean {
  return event.dataTransfer?.types.includes('Files') === true
}

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
      if (!carriesFiles({ event })) return
      depth += 1
      setIsDragging(true)
    }

    function onDragOver(event: DragEvent): void {
      // Claiming the drop only for file drags leaves an in-app drag to the row
      // that started it.
      if (!carriesFiles({ event })) return
      event.preventDefault()
    }

    function onDragLeave(event: DragEvent): void {
      // Counted only against the enters that were counted, or the depth drifts.
      if (!carriesFiles({ event })) return
      depth -= 1
      if (depth <= 0) {
        depth = 0
        setIsDragging(false)
      }
    }

    function onDrop(event: DragEvent): void {
      if (!carriesFiles({ event })) return
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
