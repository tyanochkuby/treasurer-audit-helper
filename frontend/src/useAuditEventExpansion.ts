import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AuditEvent } from './types'

interface ExpansionState {
  documentId: string
  eventIds: string[]
  expanded: Record<string, boolean>
}

function newestIndex(items: AuditEvent[], newestFirst: boolean) {
  return newestFirst ? 0 : items.length - 1
}

function defaultExpansion(items: AuditEvent[], newestFirst: boolean) {
  const expandAll = items.length <= 4
  const mostRecent = newestIndex(items, newestFirst)
  return Object.fromEntries(items.map((item, index) => [item.id, item.changes.length > 0 && (expandAll || index === mostRecent)]))
}

function sameExpansion(current: ExpansionState, eventIds: string[], expanded: Record<string, boolean>) {
  return current.eventIds.length === eventIds.length
    && current.eventIds.every((eventId, index) => eventId === eventIds[index] && current.expanded[eventId] === expanded[eventId])
}

export function useAuditEventExpansion(documentId: string, items: AuditEvent[], filtered: boolean, filterKey: string, newestFirst = true) {
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
        return { documentId, eventIds: items.map((item) => item.id), expanded: defaultExpansion(items, newestFirst) }
      }

      if (items.length < current.eventIds.length) {
        console.warn('Audit history returned fewer events; resetting event expansion state.')
        return { documentId, eventIds: items.map((item) => item.id), expanded: defaultExpansion(items, newestFirst) }
      }

      const eventIds = items.map((item) => item.id)
      const nextExpanded: Record<string, boolean> = {}
      const mostRecent = newestIndex(items, newestFirst)
      items.forEach((item, index) => {
        nextExpanded[item.id] = item.changes.length > 0 && (current.expanded[item.id] ?? index === mostRecent)
      })
      return sameExpansion(current, eventIds, nextExpanded) ? current : { documentId, eventIds, expanded: nextExpanded }
    })
  }, [documentId, filtered, items, newestFirst])

  const expandedIds = useMemo(() => {
    const ids = new Set<string>()
    const stateMatchesDocument = state?.documentId === documentId
    const expandAllByDefault = items.length <= 4
    const mostRecent = newestIndex(items, newestFirst)

    for (const [index, item] of items.entries()) {
      const expanded = item.changes.length > 0 && (filtered
        ? (filteredOverrides[item.id] ?? true)
        : stateMatchesDocument
          ? (state.expanded[item.id] ?? (expandAllByDefault || index === mostRecent))
          : (expandAllByDefault || index === mostRecent))
      if (expanded) ids.add(item.id)
    }
    return ids
  }, [documentId, filtered, filteredOverrides, items, newestFirst, state])

  const setEventExpanded = useCallback((eventId: string, expanded: boolean) => {
    if (filtered) {
      setFilteredOverrides((current) => ({ ...current, [eventId]: expanded }))
      return
    }
    setState((current) => {
      const base = current?.documentId === documentId
        ? current
        : { documentId, eventIds: items.map((item) => item.id), expanded: defaultExpansion(items, newestFirst) }
      return { ...base, expanded: { ...base.expanded, [eventId]: expanded } }
    })
  }, [documentId, filtered, items, newestFirst])

  const setAllExpanded = useCallback((expanded: boolean) => {
    const values = Object.fromEntries(items.map((item) => [item.id, item.changes.length > 0 && expanded]))
    if (filtered) {
      setFilteredOverrides(values)
      return
    }
    setState({ documentId, eventIds: items.map((item) => item.id), expanded: values })
  }, [documentId, filtered, items])

  return {
    expandedIds,
    allExpanded: items.some((item) => item.changes.length > 0) && items.every((item) => item.changes.length === 0 || expandedIds.has(item.id)),
    expandableCount: items.filter((item) => item.changes.length > 0).length,
    setEventExpanded,
    setAllExpanded,
  }
}
