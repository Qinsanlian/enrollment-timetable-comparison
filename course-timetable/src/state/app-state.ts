// ─────────────────────────────────────────────
// src/state/app-state.ts
// 全局应用状态：撤销/重做历史栈 + 状态栏消息
// ─────────────────────────────────────────────

import type { AppStateSnapshot } from '../types'
import { cloneEnroll } from '../core/course-model'

// ── 历史栈（模块级单例，与原代码行为一致） ────

const MAX_HISTORY = 60

let undoStack: AppStateSnapshot[] = []
let redoStack: AppStateSnapshot[] = []

/** 提交一个新快照到撤销栈，同时清空重做栈 */
export function pushSnapshot(snapshot: AppStateSnapshot): void {
  undoStack.push(cloneSnapshot(snapshot))
  if (undoStack.length > MAX_HISTORY) undoStack.shift()
  redoStack = []
}

/** 撤销：弹出撤销栈顶，将其压入重做栈，返回要恢复的快照 */
export function popUndo(current: AppStateSnapshot): AppStateSnapshot | null {
  if (!undoStack.length) return null
  const snapshot = cloneSnapshot(undoStack.pop()!)
  redoStack.push(snapshot)
  if (redoStack.length > MAX_HISTORY) redoStack.shift()
  return cloneSnapshot(snapshot)
}

/** 重做：弹出重做栈顶，将其压入撤销栈，返回要恢复的快照 */
export function popRedo(current: AppStateSnapshot): AppStateSnapshot | null {
  if (!redoStack.length) return null
  const snapshot = cloneSnapshot(redoStack.pop()!)
  undoStack.push(snapshot)
  if (undoStack.length > MAX_HISTORY) undoStack.shift()
  return cloneSnapshot(snapshot)
}

export function canUndo(): boolean { return undoStack.length > 0 }
export function canRedo(): boolean { return redoStack.length > 0 }

/** 清空历史栈（清除缓存时调用） */
export function clearHistory(): void {
  undoStack = []
  redoStack = []
}

// ── 状态栏消息（模块级单例） ──────────────────

let statusLastAutosaveAt: number | null = null
let statusLastActionMessage = ''
let statusLastErrorMessage = ''

export function markStatusAutosaveNow(): void {
  statusLastAutosaveAt = Date.now()
}

export function updateStatusLastAction(msg: string): void {
  statusLastActionMessage = msg
}

export function updateStatusLastError(msg: string): void {
  statusLastErrorMessage = msg
}

export function getStatusState(): {
  lastAutosaveAt: number | null
  lastActionMessage: string
  lastErrorMessage: string
} {
  return {
    lastAutosaveAt: statusLastAutosaveAt,
    lastActionMessage: statusLastActionMessage,
    lastErrorMessage: statusLastErrorMessage,
  }
}

// ── 内部辅助 ──────────────────────────────────

function cloneSnapshot(s: AppStateSnapshot): AppStateSnapshot {
  return {
    grid: { ...s.grid },
    enroll: cloneEnroll(s.enroll),
    slotParams: { ...s.slotParams },
    sheetRenderLang: s.sheetRenderLang,
    uiLangPref: s.uiLangPref,
    activeThirdBands: [...s.activeThirdBands],
  }
}
