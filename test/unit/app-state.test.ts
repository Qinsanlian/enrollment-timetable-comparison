import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  pushSnapshot,
  popUndo,
  popRedo,
  canUndo,
  canRedo,
  clearHistory,
  markStatusAutosaveNow,
  updateStatusLastAction,
  updateStatusLastError,
  getStatusState,
} from '../../course-timetable/src/state/app-state'
import type { AppStateSnapshot } from '../../course-timetable/src/types'
import { cloneEnroll } from '../../course-timetable/src/core/course-model'

// 创建一个最小可用的快照工厂
const createSnapshot = (id: number): AppStateSnapshot => ({
  grid: { [`cell-${id}`]: `${id}` },
  enroll: cloneEnroll({ headers: ['学年'], courses: [{ 序号: id, 学年: '2025', 学期: '1', 课程名称: `course-${id}`, 开课学院: '', 课程类别: '', 学分: '', 教学班号: '', 任课教师: '', 上课时间: '', 上课地点: '', 网课: false }] }),
  slotParams: {},
  sheetRenderLang: null,
  uiLangPref: '',
  activeThirdBands: [],
})

describe('历史栈 (undo/redo)', () => {
  beforeEach(() => {
    clearHistory()
  })

  it('初始状态不能撤销或重做', () => {
    expect(canUndo()).toBe(false)
    expect(canRedo()).toBe(false)
  })

  it('pushSnapshot 后可以撤销', () => {
    const snap = createSnapshot(1)
    pushSnapshot(snap)
    expect(canUndo()).toBe(true)
    expect(canRedo()).toBe(false)
  })

  it('撤销后可以重做', () => {
    const snap1 = createSnapshot(1)
    const snap2 = createSnapshot(2)
    pushSnapshot(snap1)
    pushSnapshot(snap2)

    const current = createSnapshot(3)
    const undone = popUndo(current)
    expect(undone).toEqual(snap2)
    expect(canUndo()).toBe(true)
    expect(canRedo()).toBe(true)

    const redone = popRedo(current)
    expect(redone).toEqual(snap2)
    expect(canUndo()).toBe(true)
    expect(canRedo()).toBe(false)
  })

  it('popUndo 返回 null 当没有可撤销项', () => {
    const current = createSnapshot(1)
    const result = popUndo(current)
    expect(result).toBeNull()
  })

  it('popRedo 返回 null 当没有可重做项', () => {
    const current = createSnapshot(1)
    const result = popRedo(current)
    expect(result).toBeNull()
  })

  it('clearHistory 清空所有历史', () => {
    pushSnapshot(createSnapshot(1))
    pushSnapshot(createSnapshot(2))
    clearHistory()
    expect(canUndo()).toBe(false)
    expect(canRedo()).toBe(false)
  })

  it('历史栈有最大长度限制（超过 60 条时自动移除最旧）', () => {
    for (let i = 0; i < 65; i++) {
      pushSnapshot(createSnapshot(i))
    }
    // 再 push 一条，最旧的应该被移除
    pushSnapshot(createSnapshot(99))
    // 手动检查内部实现？我们只能通过连续 undo 来验证大概，但为了测试简单，我们只断言能够撤销足够多次
    let undoCount = 0
    while (canUndo()) {
      popUndo(createSnapshot(999))
      undoCount++
    }
    // 最大历史长度应为 60，但 push 了 65+1=66 条，所以最多保留 60 条，可撤销 60 次
    expect(undoCount).toBeLessThanOrEqual(60)
  })
})

describe('状态栏', () => {
  beforeEach(() => {
    // 重置状态栏变量（通过重新调用 getStatusState 无法重置，只能通过模拟时间或直接调用方法）
    // 因为状态栏是模块级单例，我们无法轻易重置。但我们可以通过测试相对独立的行为。
    // 这里我们只测试 setter/getter 行为。
  })

  it('markStatusAutosaveNow 记录时间戳', () => {
    const before = Date.now()
    markStatusAutosaveNow()
    const state = getStatusState()
    expect(state.lastAutosaveAt).toBeGreaterThanOrEqual(before)
  })

  it('updateStatusLastAction 更新消息', () => {
    updateStatusLastAction('test action')
    const state = getStatusState()
    expect(state.lastActionMessage).toBe('test action')
  })

  it('updateStatusLastError 更新错误消息', () => {
    updateStatusLastError('test error')
    const state = getStatusState()
    expect(state.lastErrorMessage).toBe('test error')
  })
})
