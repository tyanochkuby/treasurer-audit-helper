import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AuditEvent } from './types'
import { useAuditEventExpansion } from './useAuditEventExpansion'

function events(count: number, firstId = 1): AuditEvent[] {
  return Array.from({ length: count }, (_, index) => ({
    id: String(firstId + index),
    contractId: 'contract',
    occurredAtUtc: '2026-07-14T08:42:12Z',
    actorDisplayName: 'anna@example.pl',
    actorId: 'actor-id',
    operationType: 'Modified',
    entityTypeCode: 1,
    entityType: 'ContractHeaderEntity',
    entityId: null,
    description: null,
    changes: [{ fieldName: 'Number', fieldDisplayName: 'Numer', oldValue: '1', newValue: '2' }],
  }))
}

describe('useAuditEventExpansion', () => {
  it('expands every short history and only the newest event in a long history', () => {
    const shortItems = events(4)
    const longItems = events(5)
    const short = renderHook(() => useAuditEventExpansion('a', shortItems, false, ''))
    expect([...short.result.current.expandedIds]).toEqual(['1', '2', '3', '4'])

    const long = renderHook(() => useAuditEventExpansion('b', longItems, false, ''))
    expect([...long.result.current.expandedIds]).toEqual(['1'])
  })

  it('preserves existing choices on refresh and expands only a newly arrived newest event', () => {
    const initial = events(5, 2)
    const { result, rerender } = renderHook(
      ({ items }) => useAuditEventExpansion('a', items, false, ''),
      { initialProps: { items: initial } },
    )

    act(() => result.current.setEventExpanded('3', true))
    rerender({ items: [events(1)[0], ...initial] })

    expect([...result.current.expandedIds]).toEqual(['1', '2', '3'])
  })

  it('resets to defaults and warns when refresh returns fewer events', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { result, rerender } = renderHook(
      ({ items }) => useAuditEventExpansion('a', items, false, ''),
      { initialProps: { items: events(5) } },
    )

    act(() => result.current.setAllExpanded(true))
    rerender({ items: events(4) })

    expect([...result.current.expandedIds]).toEqual(['1', '2', '3', '4'])
    expect(warning).toHaveBeenCalledOnce()
  })

  it('auto-expands filtered matches and restores the previous state afterwards', () => {
    const items = events(5)
    const { result, rerender } = renderHook(
      ({ filtered, filterKey }) => useAuditEventExpansion('a', items, filtered, filterKey),
      { initialProps: { filtered: false, filterKey: '' } },
    )

    act(() => result.current.setEventExpanded('2', true))
    rerender({ filtered: true, filterKey: 'search=number' })
    expect(result.current.allExpanded).toBe(true)

    rerender({ filtered: false, filterKey: '' })
    expect([...result.current.expandedIds]).toEqual(['1', '2'])
  })
})
