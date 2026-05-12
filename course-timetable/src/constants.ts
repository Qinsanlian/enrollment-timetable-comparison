// ─────────────────────────────────────────────
// 全局常量（与原 index.html 中的 JS 常量保持一致）
// ─────────────────────────────────────────────

import type { DayDef, SlotDef, SlotTimeConfig } from './types'

// ── 版本 ──────────────────────────────────────
export const APP_VERSION = 'v1.1.5'

// ── 星期 / 课次 ───────────────────────────────
export const DAYS: DayDef[] = [
  { key: 'mon', label: '周一' },
  { key: 'tue', label: '周二' },
  { key: 'wed', label: '周三' },
  { key: 'thu', label: '周四' },
  { key: 'fri', label: '周五' },
  { key: 'sat', label: '周六' },
  { key: 'sun', label: '周日' },
]

export const SLOTS: SlotDef[] = [
  { key: 'p12',   label: '第1–2节' },
  { key: 'p34',   label: '第3–4节' },
  { key: 'p56',   label: '第5–6节' },
  { key: 'p78',   label: '第7–8节' },
  { key: 'p910',  label: '第9–10节' },
  { key: 'p1112', label: '第11–12节' },
]

// ── 课次时间默认值 ────────────────────────────
export const SLOT_TIME_DEFAULT = '(xx:xx~xx:xx)'

export const SLOT_CONFIG_DEFAULT: SlotTimeConfig = {
  startTime:      '08:00',
  lessonMin:      45,
  breakInnerMin:  5,
  breakAfterMin:  10,
  noonMin:        90,
  eveningMin:     60,
}

// ── localStorage 键名 ─────────────────────────
export const STORAGE_BACKUP_SUFFIX = '__bak'

export const LS_KEY              = 'courseScheduleGridV3_monoA3_mf'
export const LS_KEY_GRID_BAK     = LS_KEY + STORAGE_BACKUP_SUFFIX
export const LS_KEY_UI_LANG      = 'courseScheduleUiLangPrefV1'
export const LS_KEY_EN_NAMES     = 'courseScheduleEnglishByIndexV1'
export const LS_KEY_EN_NAMES_ZH  = 'courseScheduleEnglishByIndexV1_zh'
export const LS_KEY_EN_NAMES_EN  = 'courseScheduleEnglishByIndexV1_en'
export const LS_KEY_SHOW_EN_SUB  = 'courseScheduleShowEnSubCellV1'
export const LS_KEY_ENROLL       = 'courseScheduleEnrollDataV2'
export const LS_KEY_ENROLL_ZH    = 'courseScheduleEnrollDataV2_zh'
export const LS_KEY_ENROLL_EN    = 'courseScheduleEnrollDataV2_en'
export const LS_KEY_SLOT_PARAMS  = 'courseScheduleSlotParamsV1'
export const LS_KEY_SLOT_TIMES   = 'courseScheduleSlotTimesV1'
export const LS_KEY_COMPLIANCE_LOG = 'courseScheduleComplianceLogV2'

/** 所有工具写入的 localStorage 键（清除缓存时遍历） */
export const LS_KEYS_ALL_TOOL: string[] = [
  LS_KEY,
  LS_KEY_GRID_BAK,
  LS_KEY_UI_LANG,
  LS_KEY_EN_NAMES,
  LS_KEY_EN_NAMES_ZH,
  LS_KEY_EN_NAMES_EN,
  LS_KEY_SHOW_EN_SUB,
  LS_KEY_ENROLL,
  LS_KEY_ENROLL_ZH,
  LS_KEY_ENROLL_EN,
  LS_KEY_SLOT_PARAMS,
  LS_KEY_SLOT_TIMES,
  LS_KEY_COMPLIANCE_LOG,
]

// ── sessionStorage 键名 ───────────────────────
export const SESSION_KEY_PAGE_SESSION_ACTIVE      = 'courseSchedulePageSessionActive'
export const SESSION_KEY_REFRESH_MARK             = 'courseScheduleRefreshMark'
export const SESSION_KEY_SERVICE_CONSENT_NAME_HASH = 'courseScheduleServiceConsentNameHash'

// ── 选课表列头（与教务 xlsx 固定列顺序一致） ──
export const ENROLL_XLSX_FIXED_COLS = [
  '学年', '学期', '课程名称', '开课学院',
  '课程类别', '学分', '教学班号', '任课教师',
  '上课时间', '上课地点',
] as const

export const ENROLL_HEADERS_DISPLAY = [
  '学年', '学期', '课程名称', '开课学院',
  '课程类别', '学分', '教学班号', '任课教师',
  '上课时间', '上课地点', '网课',
] as const

// ── 网课关键字（课程名/教师名含以下词时自动标记网课） ──
export const ONLINE_COURSE_KEYWORDS = [
  '尔雅', '网络课', '网课', 'online', 'erya',
] as const
