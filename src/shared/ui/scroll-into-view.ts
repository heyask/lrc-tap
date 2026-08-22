/**
 * Brings a row to the middle of its scroller. The behaviour is chosen here
 * rather than left to the browser: Chrome drops a `smooth` scroll entirely when
 * the reader asks for reduced motion, which would leave the list stuck at the
 * top instead of following along.
 */
export function scrollRowIntoView({ row }: { row: Element | null | undefined }): void {
  if (row === null || row === undefined) return

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  row.scrollIntoView({ block: 'center', behavior: prefersReducedMotion ? 'auto' : 'smooth' })
}
