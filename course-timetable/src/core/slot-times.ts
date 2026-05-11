// ─────────────────────────────────────────────
// src/core/slot-times.ts — 课次时间计算（纯函数，无 DOM 依赖）
// ─────────────────────────────────────────────

import type { SlotTimeConfig } from '../types'
import { SLOTS, SLOT_TIME_DEFAULT, SLOT_CONFIG_DEFAULT } from '../constants'

/** 解析 "HH:MM" → 分钟数，失败返回 null */
export function parseTimeHmToMinutes(text: unknown): number | null {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(String(text == null ? '' : text))
  if (!m) return null
  const hh = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59)
    return null
  return hh * 60 + mm
}

/** 分钟数 → "HH:MM" */
export function formatMinutesToHm(total: unknown): string {
  const safe = ((Number(total) || 0) % 1440 + 1440) % 1440
  const hh = Math.floor(safe / 60)
  const mm = safe % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** 分钟数加法 */
export function addMinutes(base: unknown, delta: unknown): number {
  return (Number(base) || 0) + (Number(delta) || 0)
}

/** 归一化课次时间配置参数（补全缺失字段，修正非法值） */
export function normalizeSlotParams(p: Partial<SlotTimeConfig>): SlotTimeConfig {
  return {
    startTime:
      typeof p.startTime === 'string' && parseTimeHmToMinutes(p.startTime) != null
        ? p.startTime
        : SLOT_CONFIG_DEFAULT.startTime,
    lessonMin: Number.isFinite(Number(p.lessonMin))
      ? Math.max(1, parseInt(String(p.lessonMin), 10))
      : SLOT_CONFIG_DEFAULT.lessonMin,
    breakInnerMin: Number.isFinite(Number(p.breakInnerMin))
      ? Math.max(0, parseInt(String(p.breakInnerMin), 10))
      : SLOT_CONFIG_DEFAULT.breakInnerMin,
    breakAfterMin: Number.isFinite(Number(p.breakAfterMin))
      ? Math.max(0, parseInt(String(p.breakAfterMin), 10))
      : SLOT_CONFIG_DEFAULT.breakAfterMin,
    noonMin: Number.isFinite(Number(p.noonMin))
      ? Math.max(0, parseInt(String(p.noonMin), 10))
      : SLOT_CONFIG_DEFAULT.noonMin,
    eveningMin: Number.isFinite(Number(p.eveningMin))
      ? Math.max(0, parseInt(String(p.eveningMin), 10))
      : SLOT_CONFIG_DEFAULT.eveningMin,
  }
}

/**
 * 根据课次时间配置计算每个课次的时间段字符串。
 * 返回 `{ [slotKey]: "HH:MM~HH:MM" }` 映射。
 */
export function computeSlotTimes(params: SlotTimeConfig): Record<string, string> {
  const start = parseTimeHmToMinutes(params.startTime)
  if (start == null) {
    return Object.fromEntries(SLOTS.map((s) => [s.key, SLOT_TIME_DEFAULT]))
  }
  const lesson = Math.max(1, Number(params.lessonMin) || SLOT_CONFIG_DEFAULT.lessonMin)
  const breakInner = Math.max(0, Number(params.breakInnerMin) || 0)
  const breakAfter = Math.max(0, Number(params.breakAfterMin) || 0)
  const noon = Math.max(0, Number(params.noonMin) || 0)
  const evening = Math.max(0, Number(params.eveningMin) || 0)
  const pairLen = 2 * lesson + breakInner

  const p12Start = start
  const p12End = addMinutes(p12Start, pairLen)
  const p34Start = addMinutes(p12End, breakAfter)
  const p34End = addMinutes(p34Start, pairLen)
  const p56Start = addMinutes(p34End, noon)
  const p56End = addMinutes(p56Start, pairLen)
  const p78Start = addMinutes(p56End, breakAfter)
  const p78End = addMinutes(p78Start, pairLen)
  const p910Start = addMinutes(p78End, evening)
  const p910End = addMinutes(p910Start, pairLen)
  const p1112Start = addMinutes(p910End, breakAfter)
  const p1112End = addMinutes(p1112Start, pairLen)

  const fmt = (s: number, e: number) =>
    `${formatMinutesToHm(s)}~${formatMinutesToHm(e)}`

  return {
    p12:   fmt(p12Start,   p12End),
    p34:   fmt(p34Start,   p34End),
    p56:   fmt(p56Start,   p56End),
    p78:   fmt(p78Start,   p78End),
    p910:  fmt(p910Start,  p910End),
    p1112: fmt(p1112Start, p1112End),
  }
}

/**
 * 从已计算的时间映射中获取指定课次的显示字符串。
 * slotTimesMap 由 computeSlotTimes 生成并持久化到 localStorage。
 */
export function getSlotTimeDisplay(
  slotKey: string,
  slotTimesMap: Record<string, string>,
): string {
  return slotTimesMap[slotKey] ?? SLOT_TIME_DEFAULT
}
