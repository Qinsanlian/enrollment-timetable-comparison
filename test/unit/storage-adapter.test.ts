// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { backupKey, saveWithBackup, loadWithFallback, clearAllKeys } from '../../course-timetable/src/state/storage-adapter'

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

describe('backupKey', () => {
  it('返回键名加 __bak', () => {
    expect(backupKey('test')).toBe('test__bak')
  })
})

describe('saveWithBackup', () => {
  it('写入主键和备份键', () => {
    saveWithBackup('mykey', 'value123')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('mykey', 'value123')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('mykey__bak', 'value123')
  })
})

describe('loadWithFallback', () => {
  it('优先返回主键值', () => {
    localStorageMock.setItem('main', 'mainValue')
    localStorageMock.setItem('main__bak', 'bakValue')
    const result = loadWithFallback('main')
    expect(result).toBe('mainValue')
  })

  it('主键不存在时返回备份键值', () => {
    localStorageMock.setItem('main__bak', 'bakOnly')
    const result = loadWithFallback('main')
    expect(result).toBe('bakOnly')
  })

  it('都不存在返回 null', () => {
    const result = loadWithFallback('nonexistent')
    expect(result).toBe(null)
  })
})

describe('clearAllKeys', () => {
  it('删除传入的所有键及其备份键', () => {
    localStorageMock.setItem('a', '1')
    localStorageMock.setItem('a__bak', '1bak')
    localStorageMock.setItem('b', '2')
    localStorageMock.setItem('b__bak', '2bak')
    clearAllKeys(['a', 'b'])
    expect(localStorageMock.getItem('a')).toBe(null)
    expect(localStorageMock.getItem('a__bak')).toBe(null)
    expect(localStorageMock.getItem('b')).toBe(null)
    expect(localStorageMock.getItem('b__bak')).toBe(null)
  })
})
