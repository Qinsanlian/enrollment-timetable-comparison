// ─────────────────────────────────────────────
// src/main.ts — 入口：加载样式 + 挂载 __tsBridge + 启动 legacy
// ─────────────────────────────────────────────

import './styles/main.css'

// ── 纯函数模块 ────────────────────────────────
import {
  escapeHtml,
  toHalfWidthChars,
  normalizeCell,
  parseOnlineField,
  enrollCategoryTdClass,
  courseCategoryIsFuzzy,
  cellId,
  parseCellId,
  byIndex,
  courseCodeFromRow,
  joinBands,
  splitCellBands,
  parseBandToken,
} from './utils/helpers'

import {
  cloneEnroll,
  createDefaultEnroll,
  inferOnlineFlag,
  normalizeEnrollShape,
  finalizeCourseIndices,
  parseEnrollAoaFixedNoHeader,
} from './core/course-model'

import {
  parseCourseToSchedulePlacements,
  weekHintForCell,
  parseOneScheduleSegment,
  parseWeekdayKeyInText,
  normalizeTimeToken,
  normalizeScheduleSegmentForParse,
  normalizeCourseScheduleForAutofill,
  formatWeekPatternDisplay,
  slotLessonBounds,
  slotKeysCoveringLessonRange,
} from './core/schedule-parser'

import {
  computeSlotTimes,
  normalizeSlotParams,
  parseTimeHmToMinutes,
  formatMinutesToHm,
  addMinutes,
  getSlotTimeDisplay,
} from './core/slot-times'

import {
  safeJsonParse,
  load,
  save,
  saveWithBackup,
  loadWithFallback,
} from './state/storage-adapter'

import { DAYS, SLOTS, APP_VERSION } from './constants'
import type { TsBridge } from './types'

// ── 挂载 __tsBridge ───────────────────────────
// legacy.js 可通过 window.__tsBridge.xxx() 调用 TS 纯函数
// 同时供浏览器控制台调试使用

const bridge: TsBridge = {
  // utils/helpers
  escapeHtml,
  toHalfWidthChars,
  normalizeCell,
  parseOnlineField,
  enrollCategoryTdClass,
  courseCategoryIsFuzzy,
  cellId,
  parseCellId,
  byIndex: (n, courses) => byIndex(n, courses),
  courseCodeFromRow,
  joinBands,
  splitCellBands,
  parseBandToken,
  // core/course-model
  cloneEnroll,
  createDefaultEnroll,
  inferOnlineFlag,
  normalizeEnrollShape,
  finalizeCourseIndices,
  parseEnrollAoaFixedNoHeader,
  // core/schedule-parser
  parseCourseToSchedulePlacements,
  weekHintForCell,
  parseOneScheduleSegment,
  parseWeekdayKeyInText,
  normalizeTimeToken,
  normalizeScheduleSegmentForParse,
  normalizeCourseScheduleForAutofill,
  formatWeekPatternDisplay,
  slotLessonBounds,
  slotKeysCoveringLessonRange,
  // core/slot-times
  computeSlotTimes,
  normalizeSlotParams,
  parseTimeHmToMinutes,
  formatMinutesToHm,
  addMinutes,
  getSlotTimeDisplay,
  // state/storage-adapter
  safeJsonParse,
  load,
  save,
  saveWithBackup,
  loadWithFallback,
  // constants
  DAYS,
  SLOTS,
  APP_VERSION,
}

;(window as unknown as Record<string, unknown>).__tsBridge = bridge

// ── 启动 legacy（动态 import 确保 bridge 先挂载）────
import('./legacy.js')
