// ─────────────────────────────────────────────
// 选课表 & 周课表工具 — 核心类型定义
// ─────────────────────────────────────────────

/** 界面语言，'zh' 为中文，'en' 为英文 */
export type UiLang = 'zh' | 'en';

/** 网课来源标记：manual=用户手动勾选，auto=导入时自动推断，none=未标记 */
export type OnlineSource = 'manual' | 'auto' | 'none';

/**
 * 单门课程数据（内存模型）。
 * 教务 xlsx 无序号/网课列，导入时自动补全。
 *
 * @property 序号 - 正整数，唯一标识；周课表格子里填写此序号
 * @property 学年 - 格式 "2025-2026"
 * @property 学期 - "1" 或 "2"
 * @property 课程名称 - 中文或英文名称
 * @property 开课学院 - 开课学院/部门名称
 * @property 课程类别 - 如"公共必修课"、"专业必修课"、"公共选修课"等
 * @property 学分 - 保留字符串避免浮点精度问题，如 "1.5"
 * @property 教学班号 - 唯一班号，用作课程代号显示
 * @property 任课教师 - 多位教师用逗号分隔
 * @property 上课时间 - 多段用分号分隔，每段格式如 "星期三第3-4节{2-19周}"
 * @property 上课地点 - 与上课时间段一一对应，分号分隔
 * @property 网课 - true 表示纯网课，不参与周课表自动填格
 * @property 网课来源 - 可选，标记网课标志的来源
 */
export interface Course {
  readonly 序号: number;
  学年: string;
  学期: string;
  课程名称: string;
  开课学院: string;
  课程类别: string;
  /** 原始数据保留字符串，避免浮点精度问题，如 "1.5" */
  学分: string;
  教学班号: string;
  任课教师: string;
  上课时间: string;
  上课地点: string;
  网课: boolean;
  网课来源?: OnlineSource;
}

/**
 * 选课表整体数据结构。
 * headers 与教务 xlsx 列名对应，courses 为所有课程对象数组。
 */
export interface EnrollData {
  /** 列名数组，如 ['学年', '学期', '课程名称', ...] */
  headers: string[];
  /** 所有课程对象数组，序号唯一且从 1 开始 */
  courses: Course[];
}

/**
 * 星期定义。
 * key 用于 cellId 拼接，label 用于界面显示。
 */
export interface DayDef {
  /** 星期键名，如 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' */
  key: string;
  /** 星期标签，如 '周一' … '周日' */
  label: string;
}

/**
 * 课次行定义。
 * key 用于 cellId 拼接，label 用于界面显示。
 */
export interface SlotDef {
  /** 课次键名，如 'p12' | 'p34' | 'p56' | 'p78' | 'p910' | 'p1112' */
  key: string;
  /** 课次标签，如 '第1–2节' */
  label: string;
}

/**
 * 课次时间配置（侧栏计算器参数）。
 * 所有时长单位均为分钟，startTime 格式为 'HH:MM'。
 */
export interface SlotTimeConfig {
  /** 第1节开始时间，格式 'HH:MM'，如 '08:00' */
  startTime: string;
  /** 每节课时长（分钟），如 45 */
  lessonMin: number;
  /** 同一大节内两节课之间的休息（分钟），如 5 */
  breakInnerMin: number;
  /** 大节结束后到下一大节开始前的休息（分钟），如 10 */
  breakAfterMin: number;
  /** 午休时长（分钟），插入在第4节和第5节之间，如 90 */
  noonMin: number;
  /** 傍晚休息时长（分钟），插入在第8节和第9节之间，如 60 */
  eveningMin: number;
}

/**
 * 周课表单元格存储值。
 * 格式：`"序号A|序号B|序号C"`，空栏位为空字符串。
 * 例：`"1|10|"` 表示上栏=1、中栏=10、下栏空。
 * 全空时存储为 `""`。
 */
export type GridCellValue = string;

/**
 * 整个周课表模型。
 * key 为 cellId（如 `"mon-p34"`），value 为 GridCellValue。
 * 空格子不存储键，读取时返回 `""`。
 */
export type GridModel = Record<string, GridCellValue>;

/**
 * 上课时间解析后的单个时段放置结果。
 * 用于自动填格和课程定位。
 */
export interface SlotPlacement {
  /** 星期键名，如 'mon' */
  dayKey: string;
  /** 课次键名，如 'p34' */
  slotKey: string;
  /** 可读周次描述，如 `"2-18周"` 或 `"2-18周（单周）"` */
  weekPattern?: string;
}

/**
 * 导出前检查结果。
 * 用于 showExportCheckModal 展示问题列表。
 */
export interface ExportCheckResult {
  /** 引用了不存在序号的格子 */
  invalidRefs: Array<{ cellId: string; band: number; index: number }>;
  /** 未被放入周课表的非网课课程 */
  unassignedCourses: Course[];
  /** 同一格三门课且均有效（视觉溢出风险） */
  tripleSameSlots: Array<{ cellId: string; courses: Course[] }>;
  /** 网课统计 */
  onlineCheck: {
    totalOnline: number;
    missingOnline: number;
    placedOnline: number;
  };
  /** 课程类别无法明确分类的数量 */
  fuzzyCategories: number;
  /** 内容溢出格子数量 */
  overflowCells: number;
  /** 同一时段同一教师出现在多个格子 */
  teacherConflicts: Array<{ teacher: string; cellIds: string[] }>;
  /** 同一时段同一教室出现在多个格子 */
  roomConflicts: Array<{ room: string; cellIds: string[] }>;
  /** 同一课程被拆分到多个不连续时段的警告 */
  asyncSplitWarnings: Array<{ courseIndex: number; courseName: string }>;
}

/**
 * 合规日志条目。
 * 记录用户的关键操作，持久化到 localStorage。
 */
export interface ComplianceEvent {
  /** Unix 时间戳（毫秒） */
  ts: number;
  /** 事件类型，如 'grid_input_error'、'enroll_import'、'pdf_export' */
  type: string;
  /** 事件详情，结构因 type 而异 */
  detail?: Record<string, unknown>;
}

/**
 * 导入元数据，记录最近一次 Excel 导入的文件信息。
 */
export interface EnrollImportMeta {
  /** 导入的文件名 */
  fileName: string;
  /** 导入时间，ISO 8601 格式 */
  importedAt: string;
}

/**
 * 完整项目备份（JSON 文件格式）。
 * 用于"导出申请包"和"导入备份"功能。
 */
export interface ProjectBackup {
  /** 备份格式版本，当前为 1 */
  backupVersion: 1;
  /** 导出时间，ISO 8601 格式 */
  exportedAt: string;
  /** 工具标识字符串 */
  tool: string;
  enroll: EnrollData;
  grid: GridModel;
  /** 课次时间映射，key 为 slotKey，value 为 'HH:MM~HH:MM' */
  slotTimes: Record<string, string>;
  uiLangPref: string;
  lastImportFileName: string;
  lastImportTime: string;
}

/**
 * 应用全局快照（撤销/重做栈条目）。
 * 每次用户操作前保存，用于 Ctrl+Z / Ctrl+Y。
 */
export interface AppStateSnapshot {
  grid: GridModel;
  enroll: EnrollData;
  slotConfig: SlotTimeConfig;
  /** 当前课表渲染语言，null 表示跟随界面语言 */
  sheetRenderLang: UiLang | null;
  uiLangPref: string;
  /** 已激活第三栏的格子 ID 列表 */
  activeThirdBands: string[];
  slotParams: Partial<SlotTimeConfig>;
}

// ── __tsBridge 桥接层类型 ──────────────────────

/**
 * 暴露给 legacy.js 和浏览器控制台的 TS 模块桥接对象。
 * 挂载在 `window.__tsBridge` 上，供渐进式替换使用。
 */
export interface TsBridge {
  // utils/helpers
  escapeHtml: (s: unknown) => string;
  toHalfWidthChars: (s: unknown) => string;
  normalizeCell: (v: unknown) => string;
  parseOnlineField: (raw: unknown) => boolean;
  enrollCategoryTdClass: (catRaw: unknown) => string;
  courseCategoryIsFuzzy: (catRaw: unknown) => boolean;
  cellId: (day: string, slot: string) => string;
  parseCellId: (id: string) => { dayKey: string; slotKey: string };
  byIndex: (n: unknown, courses: Course[]) => Course | null;
  courseCodeFromRow: (c: Course | null | undefined) => string;
  joinBands: (a: unknown, b: unknown, c: unknown) => string;
  splitCellBands: (v: unknown) => [string, string, string];
  parseBandToken: (v: unknown) => number | null;
  // core/course-model
  cloneEnroll: (src: EnrollData) => EnrollData;
  createDefaultEnroll: (lang: string) => EnrollData;
  inferOnlineFlag: (name: string, cat: string, time: string, place: string) => boolean;
  normalizeEnrollShape: (data: EnrollData, options?: { restoredFromStorage?: boolean }) => void;
  finalizeCourseIndices: (courses: Course[]) => Course[];
  parseEnrollAoaFixedNoHeader: (aoa: unknown[][]) => Course[] | null;
  // core/schedule-parser
  parseCourseToSchedulePlacements: (course: Course) => SlotPlacement[];
  weekHintForCell: (course: Course, dayKey: string, slotKey: string) => string;
  parseOneScheduleSegment: (seg: string) => SlotPlacement[];
  parseWeekdayKeyInText: (text: string) => string | null;
  normalizeTimeToken: (s: string) => string;
  normalizeScheduleSegmentForParse: (segment: string) => string;
  normalizeCourseScheduleForAutofill: (tf: string) => string;
  formatWeekPatternDisplay: (innerRaw: string) => string;
  slotLessonBounds: (slotKey: string) => { key: string; lo: number; hi: number } | null;
  slotKeysCoveringLessonRange: (start: number, end: number) => string[];
  // core/slot-times
  computeSlotTimes: (params: SlotTimeConfig) => Record<string, string>;
  normalizeSlotParams: (p: Partial<SlotTimeConfig>) => SlotTimeConfig;
  parseTimeHmToMinutes: (text: unknown) => number | null;
  formatMinutesToHm: (total: unknown) => string;
  addMinutes: (base: unknown, delta: unknown) => number;
  getSlotTimeDisplay: (slotKey: string, slotTimesMap: Record<string, string>) => string;
  // state/storage-adapter
  safeJsonParse: <T>(raw: string | null, fallback: T) => T;
  load: (key: string) => string | null;
  save: (key: string, data: string) => void;
  saveWithBackup: (key: string, data: string) => void;
  loadWithFallback: (key: string) => string | null;
  // constants
  DAYS: DayDef[];
  SLOTS: SlotDef[];
  APP_VERSION: string;
}
