import { describe, expect, it } from 'vitest'
import i18n from '.'

describe('Polish translations', () => {
  it('uses Polish plural forms for audit event counts', () => {
    expect(i18n.t('main.eventCount', { count: 1 })).toBe('1 zdarzenie')
    expect(i18n.t('main.eventCount', { count: 2 })).toBe('2 zdarzenia')
    expect(i18n.t('main.eventCount', { count: 5 })).toBe('5 zdarzeń')
    expect(i18n.t('main.eventCount', { count: 22 })).toBe('22 zdarzenia')
  })
})
