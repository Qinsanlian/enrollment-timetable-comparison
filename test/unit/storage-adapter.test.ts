// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { backupKey, save, saveWithBackup, loadWithFallback, clearAllKeys, STORAGE_QUOTA_EVENT } from '../../course-timetable/src/state/storage-adapter'

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

describe('save', () => {
  it('写入成功时返回 true', () => {
    const result = save('testkey', 'testvalue')
    expect(result).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('testkey', 'testvalue')
  })

  it('QuotaExceededError 时返回 false 并触发自定义事件', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError')
    })
    const handler = vi.fn()
    window.addEventListener(STORAGE_QUOTA_EVENT, handler)
    const result = save('testkey', 'testvalue')
    window.removeEventListener(STORAGE_QUOTA_EVENT, handler)
    expect(result).toBe(false)
    expect(handler).toHaveBeenCalledTimes(1)
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ key: 'testkey' })
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
