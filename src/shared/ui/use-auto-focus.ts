import { useCallback } from 'react'

/**
 * Ref callback that focuses and selects an inline editor as it mounts. Used
 * instead of the autofocus attribute, which would also fire on page load.
 */
export function useAutoFocus<Element extends HTMLInputElement | HTMLTextAreaElement>() {
  return useCallback((element: Element | null) => {
    if (element === null) return
    element.focus()
    element.select()
  }, [])
}
