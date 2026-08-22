import { useRef, useState } from 'react'
import { useNoticeStore } from '../../app/notice-store.ts'
import { Button } from '../../shared/ui/button.tsx'
import { Panel } from '../../shared/ui/panel.tsx'
import { useAutoFocus } from '../../shared/ui/use-auto-focus.ts'
import { useEditorStore } from '../editor/editor-store.ts'
import { adoptAudioFile, adoptLyricsFile, adoptLyricsText } from './load-files.ts'

export function FilesPanel() {
  const audioFileName = useEditorStore((state) => state.audioFileName)
  const lineCount = useEditorStore((state) => state.lines.length)
  const showNotice = useNoticeStore((state) => state.show)

  const audioInputRef = useRef<HTMLInputElement>(null)
  const lyricsInputRef = useRef<HTMLInputElement>(null)
  const [pasteDraft, setPasteDraft] = useState<string | null>(null)
  const pasteRef = useAutoFocus<HTMLTextAreaElement>()

  return (
    <Panel title="Files">
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.item(0)
          if (file !== null && file !== undefined) void adoptAudioFile({ file })
          event.target.value = ''
        }}
      />
      <input
        ref={lyricsInputRef}
        type="file"
        accept=".lrc,.txt,.text,text/plain"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.item(0)
          if (file !== null && file !== undefined) void adoptLyricsFile({ file })
          event.target.value = ''
        }}
      />

      <div className="flex flex-col gap-2">
        <Button size="sm" onClick={() => audioInputRef.current?.click()}>
          {audioFileName === null ? 'Choose audio…' : 'Replace audio…'}
        </Button>
        <p className="truncate text-xs text-zinc-500">
          {audioFileName === null ? 'No track loaded' : audioFileName}
        </p>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => lyricsInputRef.current?.click()}>
            Open .lrc / .txt
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => setPasteDraft(pasteDraft === null ? '' : null)}
          >
            {pasteDraft === null ? 'Paste lyrics' : 'Cancel'}
          </Button>
        </div>
        <p className="text-xs text-zinc-500">
          {lineCount === 0 ? 'No lyrics yet' : `${lineCount} lines loaded`}
        </p>

        {pasteDraft !== null && (
          <div className="flex flex-col gap-2">
            <textarea
              ref={pasteRef}
              value={pasteDraft}
              onChange={(event) => setPasteDraft(event.target.value)}
              rows={8}
              placeholder="Paste lyrics — one line per row. Existing .lrc timestamps are kept."
              className="w-full resize-y rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-teal-500 focus:outline-none"
            />
            <Button
              size="sm"
              variant="primary"
              disabled={pasteDraft.trim() === ''}
              onClick={() => {
                adoptLyricsText({ source: pasteDraft })
                setPasteDraft(null)
                showNotice({ message: 'Lyrics loaded. Press Space to start tagging.' })
              }}
            >
              Use these lyrics
            </Button>
          </div>
        )}
      </div>
    </Panel>
  )
}
