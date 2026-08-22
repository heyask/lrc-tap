import { describe, expect, test } from 'bun:test'
import { createId } from './create-id.ts'

describe('createId', () => {
  test('has the shape of a UUID v7', () => {
    // 8-4-4-4-12 hex, version nibble 7, variant nibble 8..b
    expect(createId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  test('never repeats, even in a tight burst', () => {
    const ids = Array.from({ length: 5000 }, () => createId())
    expect(new Set(ids).size).toBe(5000)
  })

  test('ids minted in one burst sort in the order they were made', () => {
    const ids = Array.from({ length: 1000 }, () => createId())
    expect([...ids].sort()).toEqual(ids)
  })
})
