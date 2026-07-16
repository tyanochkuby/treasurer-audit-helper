import { describe, expect, it } from 'vitest'
import i18n from '.'

describe('Polish translations', () => {
  it('uses Polish plural forms for audit event counts', () => {
    expect(i18n.t('main.eventCount', { count: 1 })).toBe('1 zdarzenie')
    expect(i18n.t('main.eventCount', { count: 2 })).toBe('2 zdarzenia')
    expect(i18n.t('main.eventCount', { count: 5 })).toBe('5 zdarzeń')
    expect(i18n.t('main.eventCount', { count: 22 })).toBe('22 zdarzenia')
  })

  it('uses Polish plural forms for changed-field counts', () => {
    expect(i18n.t('table.fieldCount', { count: 0 })).toBe('0 pól')
    expect(i18n.t('table.fieldCount', { count: 1 })).toBe('1 pole')
    expect(i18n.t('table.fieldCount', { count: 2 })).toBe('2 pola')
    expect(i18n.t('table.fieldCount', { count: 5 })).toBe('5 pól')
  })

  it('uses Polish plural forms for JSON differences', () => {
    expect(i18n.t('table.jsonDiffSummary', { count: 1 })).toBe('JSON · 1 pole różni się')
    expect(i18n.t('table.jsonDiffSummary', { count: 2 })).toBe('JSON · 2 pola różnią się')
    expect(i18n.t('table.jsonDiffSummary', { count: 5 })).toBe('JSON · 5 pól różni się')
  })
})
