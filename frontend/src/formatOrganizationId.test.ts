import { describe, expect, it } from 'vitest'
import { formatOrganizationId } from './formatOrganizationId'

describe('formatOrganizationId', () => {
  it('shortens a UUID while preserving recognizable ends', () => {
    expect(formatOrganizationId('e1cd1118-9795-4937-8e94-1822cae3e78f')).toBe('e1cd1118…e3e78f')
  })

  it('does not shorten an already compact identifier', () => {
    expect(formatOrganizationId('short-id')).toBe('short-id')
  })
})
