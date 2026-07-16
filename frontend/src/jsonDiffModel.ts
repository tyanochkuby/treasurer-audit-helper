import { diff } from 'jsondiffpatch'

type JsonObject = { [key: string]: JsonValue }
type JsonValue = null | boolean | number | string | JsonObject | JsonValue[]

export interface JsonChange {
  path: string
  oldValue?: JsonValue
  newValue?: JsonValue
}

export interface JsonDiffData {
  changes: JsonChange[]
}

function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function childPath(path: string, key: string | number, array: boolean) {
  if (array) return `${path}[${key}]`
  return path ? `${path}.${key}` : String(key)
}

function collectChanges(oldValue: JsonValue | undefined, newValue: JsonValue | undefined, path: string, changes: JsonChange[]) {
  if (diff(oldValue, newValue) === undefined) return

  if (isObject(oldValue) && isObject(newValue)) {
    const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)])
    for (const key of keys) collectChanges(oldValue[key], newValue[key], childPath(path, key, false), changes)
    return
  }

  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    const length = Math.max(oldValue.length, newValue.length)
    for (let index = 0; index < length; index++) collectChanges(oldValue[index], newValue[index], childPath(path, index, true), changes)
    return
  }

  changes.push({ path: path || '$', oldValue, newValue })
}

function parseJsonObject(value: string | null): JsonObject | JsonValue[] | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as JsonValue
    return isObject(parsed) || Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function createJsonDiff(oldValue: string | null, newValue: string | null): JsonDiffData | null {
  const oldJson = parseJsonObject(oldValue)
  const newJson = parseJsonObject(newValue)
  if (oldJson === null || newJson === null || diff(oldJson, newJson) === undefined) return null

  const changes: JsonChange[] = []
  collectChanges(oldJson, newJson, '', changes)
  return changes.length > 0 ? { changes } : null
}

export function formatJsonValue(value: JsonValue) {
  return JSON.stringify(value)
}
