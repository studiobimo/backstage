import { describe, expect, it } from 'vitest'

import { readableSnapshotSchema, SNAPSHOT, upgradeSnapshot } from './publishing.ts'

const PREVIOUS_FORMAT = SNAPSHOT.format - 1

describe('upgradeSnapshot', () => {
  const upgrades = {
    [PREVIOUS_FORMAT]: (stored: Record<string, unknown>) => ({ ...stored, old: 1 })
  }

  it('runs the upgrade for a stored format and stamps the current one', () => {
    expect(upgradeSnapshot({ format: PREVIOUS_FORMAT }, upgrades)).toEqual({
      format: SNAPSHOT.format,
      old: 1
    })
  })

  it('leaves a current snapshot alone', () => {
    const current = { format: SNAPSHOT.format }
    expect(upgradeSnapshot(current, upgrades)).toBe(current)
  })

  it('leaves a format with no upgrade, and anything that is not a snapshot, alone', () => {
    expect(upgradeSnapshot({ format: SNAPSHOT.format + 1 }, upgrades)).toEqual({
      format: SNAPSHOT.format + 1
    })
    expect(upgradeSnapshot(null, upgrades)).toBeNull()
  })

  it('has no upgrade registered while the current format is the first', () => {
    expect(readableSnapshotSchema.safeParse({ format: PREVIOUS_FORMAT }).success).toBe(false)
  })
})
