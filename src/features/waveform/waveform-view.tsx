import { useEffect } from 'react'
import { useAudioStore } from '../audio/audio-engine.ts'
import { useEditorStore } from '../editor/editor-store.ts'
import { useSettingsStore } from '../settings/settings-store.ts'
import { usePeaksStore } from './peaks-store.ts'
import { clearSkimmer } from './skim-preview.ts'
import { WaveformDetail } from './waveform-detail.tsx'
import { WaveformOverview } from './waveform-overview.tsx'

/** The waveform panel: the whole track above, the zoomable working surface below. */
export function WaveformView() {
  const peaks = usePeaksStore((state) => state.peaks)
  const isDecoding = usePeaksStore((state) => state.isDecoding)
  const peaksError = usePeaksStore((state) => state.error)
  const durationMs = useAudioStore((state) => state.durationMs)

  const lines = useEditorStore((state) => state.lines)
  const cursorIndex = useEditorStore((state) => state.cursorIndex)
  const skimmingEnabled = useSettingsStore((state) => state.skimming)

  // Turning skimming off from the key or the checkbox should drop any line already drawn.
  useEffect(() => {
    if (skimmingEnabled) return
    clearSkimmer()
  }, [skimmingEnabled])

  return (
    <div className="border-t border-zinc-800 bg-zinc-950">
      <WaveformOverview
        peaks={peaks}
        durationMs={durationMs}
        lines={lines}
        cursorIndex={cursorIndex}
      />
      <WaveformDetail
        peaks={peaks}
        isDecoding={isDecoding}
        peaksError={peaksError}
        durationMs={durationMs}
        lines={lines}
      />
    </div>
  )
}
