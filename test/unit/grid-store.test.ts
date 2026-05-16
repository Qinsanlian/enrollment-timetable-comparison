// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadGridFromStorage,
  writeGridStorage,
  getCellValue,
  setCellValue,
  clearGrid,
  loadActiveThirdBands,
  saveActiveThirdBands,
} from '../../course-timetable/src/state/grid-store'
import { backupKey } from '../../course-timetable/src/state/storage-adapter'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString() }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true })
  localStorageMock.clear()
  vi.clearAllMocks()
})

const MAIN_KEY = 'courseScheduleGridV3_monoA3_mf'
const BACKUP_KEY = backupKey(MAIN_KEY)

describe('loadGridFromStorage', () => {
  it('没有数据时返回空对象', () => {
    const grid = loadGridFromStorage()
    expect(grid).toEqual({})
  })

  it('读取主键的 JSON 对象', () => {
    const testGrid = { 'mon-p12': '1', 'tue-p34': '2|3' }
    localStorageMock.setItem(MAIN_KEY, JSON.stringify(testGrid))
    const grid = loadGridFromStorage()
    expect(grid).toEqual(testGrid)
  })

  it('主键损坏时返回空对象（不回退备份键）', () => {
    const backupGrid = { 'wed-p56': '5' }
    localStorageMock.setItem(BACKUP_KEY, JSON.stringify(backupGrid))
    localStorageMock.setItem(MAIN_KEY, 'invalid json')
    const grid = loadGridFromStorage()
    expect(grid).toEqual({})   // 改为 {}
  })
  
})

describe('writeGridStorage', () => {
  it('写入主键和备份键', () => {
    const grid = { 'fri-p78': '7' }
    writeGridStorage(grid)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(MAIN_KEY, JSON.stringify(grid))
    expect(localStorageMock.setItem).toHaveBeenCalledWith(BACKUP_KEY, JSON.stringify(grid))
  })
})

describe('getCellValue', () => {
  it('返回指定单元格的值，不存在时返回空字符串', () => {
    const grid = { 'mon-p12': '1' }
    expect(getCellValue(grid, 'mon-p12')).toBe('1')
    expect(getCellValue(grid, 'unknown')).toBe('')
  })
})

describe('setCellValue', () => {
  it('设置单元格值并返回新对象（不可变）', () => {
    const original = { 'mon-p12': '1' }
    const updated = setCellValue(original, 'mon-p12', '2')
    expect(updated['mon-p12']).toBe('2')
    expect(original['mon-p12']).toBe('1') // 原对象不变
  })

  it('值为空字符串时删除该键', () => {
    const grid = { 'mon-p12': '1', 'tue-p34': '2' }
    const updated = setCellValue(grid, 'mon-p12', '')
    expect(updated).not.toHaveProperty('mon-p12')
    expect(updated).toHaveProperty('tue-p34')
  })
})

describe('clearGrid', () => {
  it('返回空对象', () => {
    expect(clearGrid()).toEqual({})
  })
})

describe('loadActiveThirdBands / saveActiveThirdBands', () => {
  const THIRD_BANDS_KEY = 'courseScheduleActiveThirdBandsV1'

  it('没有数据时返回空 Set', () => {
    const set = loadActiveThirdBands()
    expect(set.size).toBe(0)
  })

  it('保存并读取 Set', () => {
    const ids = new Set(['mon-p12', 'tue-p34'])
    saveActiveThirdBands(ids)
    const loaded = loadActiveThirdBands()
    expect(loaded.size).toBe(2)
    expect(loaded.has('mon-p12')).toBe(true)
    expect(loaded.has('tue-p34')).toBe(true)
  })
})
