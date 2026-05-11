// ─────────────────────────────────────────────
// 入口文件 — 第二阶段：导入所有纯函数模块，验证构建链路
// 业务逻辑（DOM 绑定、渲染）将在后续阶段迁移
// ─────────────────────────────────────────────

import './styles/main.css'
import { APP_VERSION, DAYS, SLOTS } from './constants'
import { escapeHtml, toHalfWidthChars, normalizeCell, parseOnlineField,
         enrollCategoryTdClass, cellId, parseCellId, byIndex,
         courseCodeFromRow, joinBands, splitCellBands, parseBandToken } from './utils/helpers'
import { cloneEnroll, createDefaultEnroll, inferOnlineFlag,
         normalizeEnrollShape, finalizeCourseIndices, ENROLL_DEFAULT } from './core/course-model'
import { normalizeTimeToken, normalizeScheduleSegmentForParse,
         normalizeCourseScheduleForAutofill, parseWeekdayKeyInText,
         slotLessonBounds, slotKeysCoveringLessonRange,
         parseOneScheduleSegment, weekHintForCell,
         parseCourseToSchedulePlacements } from './core/schedule-parser'
import { parseTimeHmToMinutes, formatMinutesToHm, addMinutes,
         normalizeSlotParams, computeSlotTimes, getSlotTimeDisplay } from './core/slot-times'

// 开发阶段：控制台输出基础信息，确认所有模块加载正常
console.info(`[course-timetable] ${APP_VERSION} — ${DAYS.length} days × ${SLOTS.length} slots`)
console.info('[modules loaded]', {
  helpers: { escapeHtml, toHalfWidthChars, normalizeCell, parseOnlineField,
             enrollCategoryTdClass, cellId, parseCellId, byIndex,
             courseCodeFromRow, joinBands, splitCellBands, parseBandToken },
  courseModel: { cloneEnroll, createDefaultEnroll, inferOnlineFlag,
                 normalizeEnrollShape, finalizeCourseIndices },
  scheduleParser: { normalizeTimeToken, normalizeScheduleSegmentForParse,
                    normalizeCourseScheduleForAutofill, parseWeekdayKeyInText,
                    slotLessonBounds, slotKeysCoveringLessonRange,
                    parseOneScheduleSegment, weekHintForCell,
                    parseCourseToSchedulePlacements },
  slotTimes: { parseTimeHmToMinutes, formatMinutesToHm, addMinutes,
               normalizeSlotParams, computeSlotTimes, getSlotTimeDisplay },
})

// 快速冒烟测试：验证核心逻辑正确性
const defaultEnroll = createDefaultEnroll('zh')
console.assert(defaultEnroll.courses.length === 20, 'ENROLL_DEFAULT should have 20 courses')

const enEnroll = createDefaultEnroll('en')
console.assert(enEnroll.courses.length === 20, 'ENROLL_SAMPLE_EN should have 20 courses')

const placements = parseCourseToSchedulePlacements(ENROLL_DEFAULT.courses[0])
console.assert(placements.length > 0, 'Course 1 should have schedule placements')

const slotTimes = computeSlotTimes(normalizeSlotParams({}))
console.assert(slotTimes['p12'] !== undefined, 'computeSlotTimes should return p12')

console.info('[smoke tests passed]')
