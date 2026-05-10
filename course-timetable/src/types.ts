// ─────────────────────────────────────────────
// 选课表 & 周课表工具 — 核心类型定义
// ─────────────────────────────────────────────

/** 界面语言 */
export type UiLang = 'zh' | 'en';

/** 网课来源标记 */
export type OnlineSource = 'manual' | 'auto' | 'none';

/** 单门课程（内存模型；教务 xlsx 无序号/网课列，导入时自动补全） */
export interface Course {
  序号: number;
  学年: string;
  学期: string;
  课程名称: string;
  开课学院: string;
  课程类别: string;
  /** 原始数据保留字符串，避免浮点精度问题 */
  学分: string;
  教学班号: string;
  任课教师: string;
  上课时间: string;
  上课地点: string;
  网课: boolean;
  网课来源?: OnlineSource;
}

/** 选课表整体（headers 与教务 xlsx 列名对应） */
export interface EnrollData {
  headers: string[];
  courses: Course[];
}

/** 星期定义 */
export interface DayDef {
  key: string;   // 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
  label: string; // '周一' … '周日'
}

/** 课次行定义 */
export interface SlotDef {
  key: string;   // 'p12' | 'p34' | 'p56' | 'p78' | 'p910' | 'p1112'
  label: string; // '第1–2节' …
}

/** 课次时间配置（侧栏计算器参数） */
export interface SlotTimeConfig {
  /** 第1节开始时间，格式 'HH:MM' */
  startTime: string;
  /** 每节课时长（分钟） */
  lessonMin: number;
  /** 节间休息（分钟） */
  breakInnerMin: number;
  /** 大节后休息（分钟） */
  breakAfterMin: number;
  /** 午休时长（分钟） */
  noonMin: number;
  /** 傍晚休息时长（分钟） */
  eveningMin: number;
}

/**
 * 周课表单元格存储值。
 * 格式：`"序号A|序号B|序号C"`，空栏位为空字符串。
 * 例：`"1|10|"` 表示上栏=1、中栏=10、下栏空。
 */
export type GridCellValue = string;

/** 整个周课表模型，key 为 cellId（如 `"mon-p34"`） */
export type GridModel = Record<string, GridCellValue>;

/** 上课时间解析后的单个时段放置 */
export interface SlotPlacement {
  dayKey: string;
  slotKey: string;
  /** 原始周次描述，如 `"{2-18周}"` */
  weekPattern?: string;
}

/** 导出前检查结果 */
export interface ExportCheckResult {
  invalidRefs: Array<{ cellId: string; band: number; index: number }>;
  unassignedCourses: Course[];
  tripleSameSlots: Array<{ cellId: string; courses: Course[] }>;
  onlineCheck: {
    totalOnline: number;
    missingOnline: number;
    placedOnline: number;
  };
  fuzzyCategories: number;
  overflowCells: number;
  teacherConflicts: Array<{ teacher: string; cellIds: string[] }>;
  roomConflicts: Array<{ room: string; cellIds: string[] }>;
  asyncSplitWarnings: Array<{ courseIndex: number; courseName: string }>;
}

/** 合规日志条目 */
export interface ComplianceEvent {
  ts: number;
  type: string;
  detail?: Record<string, unknown>;
}

/** 导入元数据 */
export interface EnrollImportMeta {
  fileName: string;
  importedAt: string;
}

/** 完整项目备份（JSON 文件格式） */
export interface ProjectBackup {
  backupVersion: 1;
  exportedAt: string;
  tool: string;
  enroll: EnrollData;
  grid: GridModel;
  slotTimes: Record<string, string>;
  uiLangPref: string;
  lastImportFileName: string;
  lastImportTime: string;
}

/** 应用全局快照（撤销/重做栈条目） */
export interface AppStateSnapshot {
  grid: GridModel;
  enroll: EnrollData;
  slotConfig: SlotTimeConfig;
  sheetRenderLang: UiLang | null;
  uiLangPref: string;
  activeThirdBands: string[];
  slotParams: Partial<SlotTimeConfig>;
}
