import { useState } from 'react'
import { TransportBar } from '../features/audio/transport-bar.tsx'
import { useEditorStore } from '../features/editor/editor-store.ts'
import { EditorToolbar } from '../features/editor/editor-toolbar.tsx'
import { LyricList } from '../features/editor/lyric-list.tsx'
import { PreviewPane } from '../features/editor/preview-pane.tsx'
import { ExportPanel } from '../features/io/export-panel.tsx'
import { DropOverlay } from '../features/io/file-drop.tsx'
import { FilesPanel } from '../features/io/files-panel.tsx'
import { MetadataPanel } from '../features/lrc/metadata-panel.tsx'
import { SettingsPanel } from '../features/settings/settings-panel.tsx'
import { WaveformView } from '../features/waveform/waveform-view.tsx'
import { Button } from '../shared/ui/button.tsx'
import { EmptyState } from './empty-state.tsx'
import { useGlobalShortcuts } from './global-shortcuts.ts'
import { NoticeBar } from './notice-bar.tsx'
import { ShortcutBar } from './shortcut-bar.tsx'
import { useSessionAutosave, useSessionRestore } from './use-session.ts'

type Mode = 'edit' | 'preview'

export function App() {
  useGlobalShortcuts()
  useSessionRestore()
  useSessionAutosave()

  const [mode, setMode] = useState<Mode>('edit')
  const lineCount = useEditorStore((state) => state.lines.length)

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <h1 className="font-semibold tracking-tight">
          LRC <span className="text-teal-400">Tap</span>
        </h1>
        <p className="text-xs text-zinc-500">Sync lyrics to audio, entirely in your browser.</p>

        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant={mode === 'edit' ? 'primary' : 'ghost'}
            onClick={() => setMode('edit')}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant={mode === 'preview' ? 'primary' : 'ghost'}
            onClick={() => setMode('preview')}
          >
            Preview
          </Button>
        </div>
      </header>

      <NoticeBar />
      <TransportBar />

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          {mode === 'edit' && <EditorToolbar />}
          {mode === 'preview' ? <PreviewPane /> : lineCount === 0 ? <EmptyState /> : <LyricList />}
          <WaveformView />
        </main>

        <aside className="w-80 shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-900">
          <FilesPanel />
          <MetadataPanel />
          <SettingsPanel />
          <ExportPanel />
        </aside>
      </div>

      <ShortcutBar />
      <DropOverlay />
    </div>
  )
}
