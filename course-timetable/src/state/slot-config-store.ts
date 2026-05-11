// ─────────────────────────────────────────────
// src/state/slot-config-store.ts
// 课次时间配置的持久化读写
// ─────────────────────────────────────────────

import type { SlotTimeConfig } from '../types'
import { LS_KEY_SLOT_PARAMS } from '../constants'
import { loadWithFallback, saveWithBackup, safeJsonParse } from './storage-adapter'
import { normalizeSlotParams } from '../core/slot-times'
import { computeSlotTimes } from '../core/slot-times'
import { LS_KEY_SLOT_TIMES } from '../constants'

export const SLOT_PARAM_DEFAULTS: SlotTimeConfig = {
  startTime: '08:00',
  lessonMin: 45,
  breakInnerMin: 5,
  breakAfterMin: 10,
  noonMin: 90,
  eveningMin: 60,
}

/** 从 localStorage 读取课次时间配置，缺失字段用默认值补全 */
export function loadSlotParams(): SlotTimeConfig {
  const raw = loadWithFallback(LS_KEY_SLOT_PARAMS)
  const parsed = safeJsonParse<Partial<SlotTimeConfig>>(raw, {})
  return normalizeSlotParams(parsed)
}

/** 持久化课次时间配置，同时更新 slotTimes 映射 */
export function saveSlotParams(config: SlotTimeConfig): SlotTimeConfig {
  const normalized = normalizeSlotParams(config)
  saveWithBackup(LS_KEY_SLOT_PARAMS, JSON.stringify(normalized))
  // 同步更新 slotTimes 映射（供 getSlotTimeDisplay 使用）
  const timesMap = computeSlotTimes(normalized)
  saveWithBackup(LS_KEY_SLOT_TIMES, JSON.stringify(timesMap))
  return normalized
}

/** 从 localStorage 读取已计算的 slotTimes 映射 */
export function loadSlotTimesMap(): Record<string, string> {
  const raw = loadWithFallback(LS_KEY_SLOT_TIMES)
  return safeJsonParse<Record<string, string>>(raw, {})
}
