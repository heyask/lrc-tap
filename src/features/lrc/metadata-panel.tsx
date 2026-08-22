import { Field, Panel, TextInput } from '../../shared/ui/panel.tsx'
import { useEditorStore } from '../editor/editor-store.ts'
import { EDITABLE_METADATA_KEYS } from './lyric-line.ts'

export function MetadataPanel() {
  const metadata = useEditorStore((state) => state.metadata)
  const setMetadataValue = useEditorStore((state) => state.setMetadataValue)

  return (
    <Panel title="Tags">
      {EDITABLE_METADATA_KEYS.map((field) => {
        const value = metadata[field.key]
        return (
          <Field key={field.key} label={field.label} htmlFor={`metadata-${field.key}`}>
            <TextInput
              id={`metadata-${field.key}`}
              value={value === undefined ? '' : value}
              onChange={({ value: next }) => setMetadataValue({ key: field.key, value: next })}
            />
          </Field>
        )
      })}
    </Panel>
  )
}
