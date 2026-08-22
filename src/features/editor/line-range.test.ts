import { describe, expect, test } from 'bun:test'
import { createRange, isInRange, rangeLength } from './line-range.ts'

describe('createRange', () => {
  test('keeps a forward selection as it is', () => {
    expect(createRange({ anchor: 2, head: 5 })).toEqual({ start: 2, end: 5 })
  })

  test('normalises a selection dragged upwards', () => {
    expect(createRange({ anchor: 5, head: 2 })).toEqual({ start: 2, end: 5 })
  })

  test('a single line is a range of one', () => {
    expect(createRange({ anchor: 3, head: 3 })).toEqual({ start: 3, end: 3 })
  })
})

describe('rangeLength', () => {
  test('counts both ends', () => {
    expect(rangeLength({ range: { start: 2, end: 5 } })).toBe(4)
    expect(rangeLength({ range: { start: 3, end: 3 } })).toBe(1)
  })
})

describe('isInRange', () => {
  const range = { start: 2, end: 4 }

  test('includes both endpoints', () => {
    expect(isInRange({ range, index: 2 })).toBe(true)
    expect(isInRange({ range, index: 4 })).toBe(true)
  })

  test('excludes the lines just outside', () => {
    expect(isInRange({ range, index: 1 })).toBe(false)
    expect(isInRange({ range, index: 5 })).toBe(false)
  })
})
