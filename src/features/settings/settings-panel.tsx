import { Field, Panel } from '../../shared/ui/panel.tsx'
import { useSettingsStore } from './settings-store.ts'

export function SettingsPanel() {
  const tapOffsetMs = useSettingsStore((state) => state.tapOffsetMs)
  const auditionOnSelect = useSettingsStore((state) => state.auditionOnSelect)
  const update = useSettingsStore((state) => state.update)

  return (
    <Panel title="Tapping">
      <Field label="Tap offset" htmlFor="tap-offset">
        <input
          id="tap-offset"
          type="range"
          min={-500}
          max={500}
          step={10}
          value={tapOffsetMs}
          onChange={(event) => update({ patch: { tapOffsetMs: Number(event.target.value) } })}
          className="min-w-0 flex-1 accent-teal-400"
        />
        <span className="w-16 shrink-0 text-right font-mono text-xs text-zinc-400 tabular-nums">
          {tapOffsetMs > 0 ? `+${tapOffsetMs}` : tapOffsetMs} ms
        </span>
      </Field>
      <p className="mb-2 text-xs text-zinc-600">
        Subtracted from every tap. Raise it if your timestamps land consistently late.
      </p>

      <label className="flex items-center gap-2 py-1 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={auditionOnSelect}
          onChange={(event) => update({ patch: { auditionOnSelect: event.target.checked } })}
          className="accent-teal-400"
        />
        Play the line when I click it
      </label>
    </Panel>
  )
}
