/** Joins class names, dropping falsy entries. */
export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter((value) => typeof value === 'string' && value.length > 0).join(' ')
}
