import { SEEK_STEP_MS, SHORTCUT } from '../../shared/keyboard/shortcut-map.ts'
import { formatClock } from '../../shared/time/format-timestamp.ts'
import { Button } from '../../shared/ui/button.tsx'
import { audioEngine, useAudioStore } from './audio-engine.ts'
import { togglePlayback } from './transport.ts'
import { useCurrentTimeMs } from './use-current-time.ts'

const RATES = [0.5, 0.75, 1, 1.25, 1.5]

export function TransportBar() {
  const isReady = useAudioStore((state) => state.isReady)
  const isPlaying = useAudioStore((state) => state.isPlaying)
  const durationMs = useAudioStore((state) => state.durationMs)
  const playbackRate = useAudioStore((state) => state.playbackRate)
  const volume = useAudioStore((state) => state.volume)
  const timeMs = useCurrentTimeMs({ resolutionMs: 50 })

  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
      <Button
        variant="primary"
        onClick={togglePlayback}
        disabled={!isReady}
        shortcut={SHORTCUT.playPause}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="w-28"
      >
        {isPlaying ? 'Pause' : 'Play'}
      </Button>

      <Button
        size="sm"
        variant="ghost"
        disabled={!isReady}
        shortcut={SHORTCUT.seekBack}
        onClick={() => audioEngine.nudge({ deltaMs: -SEEK_STEP_MS.normal })}
      >
        −3s
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={!isReady}
        shortcut={SHORTCUT.seekForward}
        onClick={() => audioEngine.nudge({ deltaMs: SEEK_STEP_MS.normal })}
      >
        +3s
      </Button>

      <span className="font-mono text-sm text-zinc-300 tabular-nums">
        {formatClock({ timeMs })}
        <span className="text-zinc-600"> / {formatClock({ timeMs: durationMs })}</span>
      </span>

      <label className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
        Speed
        <select
          value={playbackRate}
          onChange={(event) =>
            audioEngine.setPlaybackRate({ playbackRate: Number(event.target.value) })
          }
          className="rounded border border-zinc-700 bg-zinc-800 px-1 py-1 text-zinc-100 focus:border-teal-500 focus:outline-none"
        >
          {RATES.map((rate) => (
            <option key={rate} value={rate}>
              {rate}×
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-zinc-400">
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => audioEngine.setVolume({ volume: Number(event.target.value) })}
          className="w-24 accent-teal-400"
        />
      </label>
    </div>
  )
}
