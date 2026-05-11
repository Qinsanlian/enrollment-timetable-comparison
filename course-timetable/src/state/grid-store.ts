// ─────────────────────────────────────────────
// src/state/grid-store.ts
// 周课表数据的持久化读写
// ─────────────────────────────────────────────

import type { GridModel } from '../types'
import { LS_KEY } from '../constants'
import { loadWithFallback, saveWithBackup, safeJsonParse } from './storage-adapter'

/** 从 localStorage 读取周课表数据 */
export function loadGridFromStorage(): GridModel {
  const raw = loadWithFallback(LS_KEY)
  const parsed = safeJsonParse<unknown>(raw, null)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as GridModel
  }
  return Object.create(null) as GridModel
}

/** 持久化周课表数据 */
export function writeGridStorage(model: GridModel): void {
  saveWithBackup(LS_KEY, JSON.stringify(model))
}

/** 立即强制写入（不防抖） */
export function flushPersistGridNow(model: GridModel): void {
  writeGridStorage(model)
}

/** 读取已激活的第三栏格子 ID 集合 */
export function loadActiveThirdBands(): Set<string> {
  try {
    const raw = localStorage.getItem('courseScheduleActiveThirdBandsV1')
    const arr = safeJsonParse<unknown>(raw, [])
    return new Set(Array.isArray(arr) ? (arr as string[]) : [])
  } catch {
    return new Set()
  }
}

/** 持久化已激活的第三栏格子 ID 集合 */
export function saveActiveThirdBands(ids: Set<string>): void {
  try {
    localStorage.setItem(
      'courseScheduleActiveThirdBandsV1',
      JSON.stringify([...ids])
    )
  } catch { /* ignore */ }
}

/** 获取单元格的存储值（不存在时返回空字符串） */
export function getCellValue(model: GridModel, cellId: string): string {
  return model[cellId] ?? ''
}

/** 设置单元格的存储值，返回新的 GridModel（不可变更新） */
export function setCellValue(model: GridModel, cellId: string, value: string): GridModel {
  const next = { ...model }
  if (value === '') {
    delete next[cellId]
  } else {
    next[cellId] = value
  }
  return next
}

/** 清空整个周课表，返回空 GridModel */
export function clearGrid(): GridModel {
  return Object.create(null) as GridModel
}
