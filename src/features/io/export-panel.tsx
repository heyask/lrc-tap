import { useNoticeStore } from '../../app/notice-store.ts'
import { SHORTCUT } from '../../shared/keyboard/shortcut-map.ts'
import { Button } from '../../shared/ui/button.tsx'
import { Panel } from '../../shared/ui/panel.tsx'
import { useEditorStore } from '../editor/editor-store.ts'
import { countUntagged } from '../editor/line-operations.ts'
import { clearStoredSession } from '../persistence/session-storage.ts'
import { copyLrcToClipboard, downloadLrc } from './export-lrc.ts'

export function ExportPanel() {
  const lines = useEditorStore((state) => state.lines)
  const metadata = useEditorStore((state) => state.metadata)
  const audioFileName = useEditorStore((state) => state.audioFileName)
  const showNotice = useNoticeStore((state) => state.show)

  const untagged = countUntagged({ lines })

  return (
    <Panel title="Export">
      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={lines.length === 0}
          shortcut={SHORTCUT.download}
          onClick={() => downloadLrc({ lines, metadata, audioFileName })}
        >
          Download .lrc
        </Button>
        <Button
          size="sm"
          disabled={lines.length === 0}
          onClick={() => {
            void copyLrcToClipboard({ lines, metadata }).then((copied) => {
              showNotice({
                message: copied ? 'LRC copied to clipboard.' : 'Clipboard access was blocked.',
                tone: copied ? 'info' : 'error',
              })
            })
          }}
        >
          Copy to clipboard
        </Button>
        {untagged > 0 && (
          <p className="text-xs text-amber-400">
            {untagged} lines still have no timestamp — they export without one.
          </p>
        )}

        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            void clearStoredSession().then(() => {
              window.location.reload()
            })
          }}
        >
          Start over
        </Button>
        <p className="text-xs text-zinc-600">
          Clears the saved track and lyrics from this browser. Nothing was ever uploaded.
        </p>
      </div>
    </Panel>
  )
}
