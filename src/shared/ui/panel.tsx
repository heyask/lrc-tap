import { ReactNode } from 'react'

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-zinc-800 px-4 py-3">
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{title}</h2>
      {children}
    </section>
  )
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <label htmlFor={htmlFor} className="w-24 shrink-0 text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  )
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string
  value: string
  onChange: (input: { value: string }) => void
  placeholder?: string
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange({ value: event.target.value })}
      className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-100 placeholder:text-zinc-600 focus:border-teal-500 focus:outline-none"
    />
  )
}
