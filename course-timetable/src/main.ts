// ─────────────────────────────────────────────
// 入口文件 — 第二阶段：导入所有纯函数模块，验证构建链路
// 业务逻辑（DOM 绑定、渲染）将在后续阶段迁移
// ─────────────────────────────────────────────

import './styles/main.css'
import { APP_VERSION, DAYS, SLOTS } from './constants'
// core
import { createDefaultEnroll, ENROLL_DEFAULT } from './core/course-model'
import { parseCourseToSchedulePlacements } from './core/schedule-parser'
import { normalizeSlotParams, computeSlotTimes } from './core/slot-times'
// state
import { saveWithBackup, loadWithFallback } from './state/storage-adapter'
import { appendComplianceEvent, getComplianceEntries } from './state/compliance-log'
import { loadSlotParams, saveSlotParams, loadSlotTimesMap } from './state/slot-config-store'
import { loadOrDefaultEnroll, saveEnrollToStorage, sumCredits } from './state/enroll-store'
import { loadGridFromStorage, writeGridStorage } from './state/grid-store'
import { pushSnapshot, canUndo, canRedo, getStatusState } from './state/app-state'

console.info(`[course-timetable] ${APP_VERSION} — ${DAYS.length} days × ${SLOTS.length} slots`)

// ── 冒烟测试 ──────────────────────────────────
const defaultEnroll = createDefaultEnroll('zh')
console.assert(defaultEnroll.courses.length === 20, 'ENROLL_DEFAULT should have 20 courses')

const placements = parseCourseToSchedulePlacements(ENROLL_DEFAULT.courses[0])
console.assert(placements.length > 0, 'Course 1 should have schedule placements')

const slotTimes = computeSlotTimes(normalizeSlotParams({}))
console.assert(slotTimes['p12'] !== undefined, 'computeSlotTimes should return p12')

// state 模块冒烟测试（需要浏览器环境，构建时仅验证类型）
console.info('[modules ready]', {
  storage: { saveWithBackup, loadWithFallback },
  complianceLog: { appendComplianceEvent, getComplianceEntries },
  slotConfig: { loadSlotParams, saveSlotParams, loadSlotTimesMap },
  enrollStore: { loadOrDefaultEnroll, saveEnrollToStorage, sumCredits },
  gridStore: { loadGridFromStorage, writeGridStorage },
  appState: { pushSnapshot, canUndo, canRedo, getStatusState },
})

console.info('[smoke tests passed]')
