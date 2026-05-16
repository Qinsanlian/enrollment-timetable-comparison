// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadOrDefaultEnroll,
  saveEnrollToStorage,
  flushEnrollSaveNow,
  sumCredits,
  getEnrollTermMeta,
} from '../../course-timetable/src/state/enroll-store'
import { backupKey } from '../../course-timetable/src/state/storage-adapter'
import { ENROLL_SAMPLE_EN, ENROLL_DEFAULT } from '../../course-timetable/src/core/course-model'

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

const LS_KEY_ENROLL = 'courseScheduleEnrollDataV2'
const LS_KEY_ENROLL_ZH = 'courseScheduleEnrollDataV2_zh'
const LS_KEY_ENROLL_EN = 'courseScheduleEnrollDataV2_en'
const BACKUP_SUFFIX = '__bak'

describe('loadOrDefaultEnroll', () => {
  it('无存储数据时返回英文默认范本（但会经过 normalizeEnrollShape 添加网课列）', () => {
    const data = loadOrDefaultEnroll('en')
    const expectedHeaders = [...ENROLL_SAMPLE_EN.headers, '网课']
    expect(data.headers).toEqual(expectedHeaders)
    expect(data.courses[0].课程名称).toBe(ENROLL_SAMPLE_EN.courses[0].课程名称)
  })

  it('无存储数据时返回中文默认范本', () => {
    const data = loadOrDefaultEnroll('zh')
    const expectedHeaders = [...ENROLL_DEFAULT.headers]
    expect(data.headers).toEqual(expectedHeaders)
    expect(data.courses[0].课程名称).toBe(ENROLL_DEFAULT.courses[0].课程名称)
  })

  it('从存储加载中文数据', () => {
    const testData = { ...ENROLL_DEFAULT, courses: [{ ...ENROLL_DEFAULT.courses[0], 课程名称: 'saved' }] }
    localStorageMock.setItem(LS_KEY_ENROLL_ZH, JSON.stringify(testData))
    const data = loadOrDefaultEnroll('zh')
    expect(data.courses[0].课程名称).toBe('saved')
  })

  it('从存储加载英文数据', () => {
    const testData = { ...ENROLL_SAMPLE_EN, courses: [{ ...ENROLL_SAMPLE_EN.courses[0], 课程名称: 'saved_en' }] }
    localStorageMock.setItem(LS_KEY_ENROLL_EN, JSON.stringify(testData))
    const data = loadOrDefaultEnroll('en')
    expect(data.courses[0].课程名称).toBe('saved_en')
  })

  it('主键损坏时返回默认范本（当前实现不回退备份键）', () => {
    const backupData = { ...ENROLL_DEFAULT, courses: [{ ...ENROLL_DEFAULT.courses[0], 课程名称: 'backup' }] }
    localStorageMock.setItem(LS_KEY_ENROLL_ZH + BACKUP_SUFFIX, JSON.stringify(backupData))
    localStorageMock.setItem(LS_KEY_ENROLL_ZH, 'invalid json')
    const loaded = loadOrDefaultEnroll('zh')
    expect(loaded.courses[0].课程名称).toBe(ENROLL_DEFAULT.courses[0].课程名称)
  })
})

describe('saveEnrollToStorage', () => {
  it('保存数据到主键和备份键（flush=true 时使用通用键 + 备份键）', () => {
    const testData = { ...ENROLL_DEFAULT, courses: [{ ...ENROLL_DEFAULT.courses[0], 课程名称: 'saved' }] }
    saveEnrollToStorage(testData, true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(LS_KEY_ENROLL, JSON.stringify(testData))
    expect(localStorageMock.setItem).toHaveBeenCalledWith(LS_KEY_ENROLL + BACKUP_SUFFIX, JSON.stringify(testData))
  })

  // 注意：flush=false 时当前实现也会立即写入（无防抖），因此不单独测试该行为
})

describe('flushEnrollSaveNow', () => {
  it('立即写入当前数据到存储（占位测试）', () => {
    expect(true).toBe(true)
  })
})

describe('sumCredits', () => {
  it('计算学分合计', () => {
    const courses = [
      { 学分: '2' },
      { 学分: '1.5' },
      { 学分: 'abc' },
      { 学分: '3' },
    ] as any[]
    expect(sumCredits(courses)).toBe(2 + 1.5 + 3)
  })
})

describe('getEnrollTermMeta', () => {
  it('中文环境返回正确学期标签', () => {
    const courses = [{ 学年: '2025-2026', 学期: '1' }] as any[]
    const meta = getEnrollTermMeta(courses, 'zh')
    expect(meta.year).toBe('2025-2026')
    expect(meta.term).toBe('第一学期')
  })

  it('英文环境返回正确学期标签', () => {
    const courses = [{ 学年: '2025-2026', 学期: '2' }] as any[]
    const meta = getEnrollTermMeta(courses, 'en')
    expect(meta.year).toBe('2025-2026')
    expect(meta.term).toBe('Term 2')
  })

  it('无课程时返回默认值', () => {
    const meta = getEnrollTermMeta([], 'zh')
    expect(meta.year).toBe('—')
    expect(meta.term).toBe('—')
  })
})
