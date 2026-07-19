import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AuditEvent } from './types'

interface ExpansionState {
  documentId: string
  eventIds: string[]
  expanded: Record<string, boolean>
}

function defaultExpansion(items: AuditEvent[]) {
  const expandAll = items.length <= 4
  return Object.fromEntries(items.map((item, index) => [item.id, expandAll || index === 0]))
}

function sameExpansion(current: ExpansionState, eventIds: string[], expanded: Record<string, boolean>) {
  return current.eventIds.length === eventIds.length
    && current.eventIds.every((eventId, index) => eventId === eventIds[index] && current.expanded[eventId] === expanded[eventId])
}

export function useAuditEventExpansion(documentId: string, items: AuditEvent[], filtered: boolean, filterKey: string) {
  const [state, setState] = useState<ExpansionState | null>(null)
  const [filteredOverrides, setFilteredOverrides] = useState<Record<string, boolean>>({})
  const previousFilterKey = useRef(filterKey)

  useEffect(() => {
    if (previousFilterKey.current === filterKey) return
    previousFilterKey.current = filterKey
    setFilteredOverrides({})
  }, [filterKey])

  useEffect(() => {
    if (!documentId || filtered) return

    setState((current) => {
      if (!current || current.documentId !== documentId) {
        return { documentId, eventIds: items.map((item) => item.id), expanded: defaultExpansion(items) }
      }

      if (items.length < current.eventIds.length) {
        console.warn('Audit history returned fewer events; resetting event expansion state.')
        return { documentId, eventIds: items.map((item) => item.id), expanded: defaultExpansion(items) }
      }

      const eventIds = items.map((item) => item.id)
      const nextExpanded: Record<string, boolean> = {}
      items.forEach((item, index) => {
        nextExpanded[item.id] = current.expanded[item.id] ?? index === 0
      })
      return sameExpansion(current, eventIds, nextExpanded) ? current : { documentId, eventIds, expanded: nextExpanded }
    })
  }, [documentId, filtered, items])

  const expandedIds = useMemo(() => {
    const ids = new Set<string>()
    const stateMatchesDocument = state?.documentId === documentId
    const expandAllByDefault = items.length <= 4

    for (const [index, item] of items.entries()) {
      const expanded = filtered
        ? (filteredOverrides[item.id] ?? true)
        : stateMatchesDocument
          ? (state.expanded[item.id] ?? (expandAllByDefault || index === 0))
          : (expandAllByDefault || index === 0)
      if (expanded) ids.add(item.id)
    }
    return ids
  }, [documentId, filtered, filteredOverrides, items, state])

  const setEventExpanded = useCallback((eventId: string, expanded: boolean) => {
    if (filtered) {
      setFilteredOverrides((current) => ({ ...current, [eventId]: expanded }))
      return
    }
    setState((current) => {
      const base = current?.documentId === documentId
        ? current
        : { documentId, eventIds: items.map((item) => item.id), expanded: defaultExpansion(items) }
      return { ...base, expanded: { ...base.expanded, [eventId]: expanded } }
    })
  }, [documentId, filtered, items])

  const setAllExpanded = useCallback((expanded: boolean) => {
    const values = Object.fromEntries(items.map((item) => [item.id, expanded]))
    if (filtered) {
      setFilteredOverrides(values)
      return
    }
    setState({ documentId, eventIds: items.map((item) => item.id), expanded: values })
  }, [documentId, filtered, items])

  return {
    expandedIds,
    allExpanded: items.length > 0 && items.every((item) => expandedIds.has(item.id)),
    setEventExpanded,
    setAllExpanded,
  }
}
