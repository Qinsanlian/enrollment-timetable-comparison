// ─────────────────────────────────────────────
// src/core/course-model.ts — 选课数据纯函数
// ─────────────────────────────────────────────

import type { Course, EnrollData } from '../types'
import { normalizeCell, parseOnlineField } from '../utils/helpers'
import { ENROLL_XLSX_FIXED_COLS, ONLINE_COURSE_KEYWORDS } from '../constants'

// ── 内嵌范本（中文） ──────────────────────────
export const ENROLL_DEFAULT: EnrollData = {
  headers: ['学年','学期','课程名称','开课学院','课程类别','学分','教学班号','任课教师','上课时间','上课地点','网课'],
  courses: [
    { 序号:1,  学年:'2025-2026',学期:'1',课程名称:'大学英语（2）',开课学院:'通识教育教学部',课程类别:'公共必修课',学分:'2',教学班号:'(2025-2026-1)-T0000008-03',任课教师:'李华',上课时间:'星期二第1-2节{2-18周};星期四第3-4节{2-18周}',上课地点:'多(B-201);多(B-201)',网课:false },
    { 序号:2,  学年:'2025-2026',学期:'1',课程名称:'人工智能与信息社会（尔雅）',开课学院:'通识教育教学部',课程类别:'公共选修课',学分:'1',教学班号:'(2025-2026-1)-13000521-01',任课教师:'超星尔雅',上课时间:'',上课地点:'',网课:true },
    { 序号:3,  学年:'2025-2026',学期:'1',课程名称:'大学生心理健康教育（二）',开课学院:'心理健康教育中心',课程类别:'公共必修课',学分:'1.2',教学班号:'(2025-2026-1)-J0000012-11',任课教师:'王丽',上课时间:'星期一第5-6节{2-19周}',上课地点:'多(B-330)',网课:false },
    { 序号:4,  学年:'2025-2026',学期:'1',课程名称:'社会实践',开课学院:'学工部（处）、人武部',课程类别:'实践环节',学分:'1.5',教学班号:'(2025-2026-1)-J0000005-15',任课教师:'张强',上课时间:'',上课地点:'',网课:true },
    { 序号:5,  学年:'2025-2026',学期:'1',课程名称:'有机化学实验',开课学院:'检验检测认证学院',课程类别:'专业必修课',学分:'1',教学班号:'(2025-2026-1)-R24H0003-02',任课教师:'刘洋,陈静',上课时间:'星期四第9-10节{3-18周}',上课地点:'多(C-215)',网课:false },
    { 序号:6,  学年:'2025-2026',学期:'1',课程名称:'英语（3-2）',开课学院:'通识教育教学部',课程类别:'公共必修课',学分:'1',教学班号:'(2025-2026-1)-T0000047-05',任课教师:'赵刚',上课时间:'星期三第3-4节{2-19周};星期五第1-2节{2-19周}',上课地点:'阶4;阶4',网课:false },
    { 序号:7,  学年:'2025-2026',学期:'1',课程名称:'形势与政策（6-2）',开课学院:'马克思主义学院',课程类别:'公共必修课',学分:'1.1',教学班号:'(2025-2026-1)-M0000035-08',任课教师:'孙红',上课时间:'星期六第1-2节{4周,9周,14周}',上课地点:'多(A-401)',网课:false },
    { 序号:8,  学年:'2025-2026',学期:'1',课程名称:'创业实务',开课学院:'创新创业学院',课程类别:'公共必修课',学分:'1.3',教学班号:'(2025-2026-1)-N0000002-06',任课教师:'周涛',上课时间:'星期二第7-8节{1-18周}',上课地点:'多(B-204)',网课:false },
    { 序号:9,  学年:'2025-2026',学期:'1',课程名称:'职业沟通与礼仪',开课学院:'通识教育教学部',课程类别:'公共必修课',学分:'1.4',教学班号:'(2025-2026-1)-T0000010-04',任课教师:'吴芳',上课时间:'',上课地点:'',网课:true },
    { 序号:10, 学年:'2025-2026',学期:'1',课程名称:'机械制图',开课学院:'智能制造学院',课程类别:'专业必修课',学分:'3',教学班号:'(2025-2026-1)-R05H0101-01',任课教师:'马超',上课时间:'星期一第9-10节{2-19周}',上课地点:'多(A-512)',网课:false },
    { 序号:11, 学年:'2025-2026',学期:'1',课程名称:'Python入门(网络课)',开课学院:'通识教育教学部',课程类别:'网络公共选修课',学分:'1',教学班号:'(2025-2026-1)-G0000020-02',任课教师:'金蕾',上课时间:'',上课地点:'',网课:true },
    { 序号:12, 学年:'2025-2026',学期:'1',课程名称:'高等数学（2-1）',开课学院:'通识教育教学部',课程类别:'公共必修课',学分:'5',教学班号:'(2025-2026-1)-T0000006-05',任课教师:'郑丽',上课时间:'星期四第5-6节{2-19周};星期二第1-2节{2-19周}',上课地点:'多(B-416);多(B-416)',网课:false },
    { 序号:13, 学年:'2025-2026',学期:'1',课程名称:'口才艺术与社交礼仪（尔雅）',开课学院:'通识教育教学部',课程类别:'公共选修课',学分:'1',教学班号:'(2025-2026-1)-13000775-01',任课教师:'超星尔雅',上课时间:'',上课地点:'',网课:true },
    { 序号:14, 学年:'2025-2026',学期:'1',课程名称:'创新创业大赛实战（尔雅）',开课学院:'通识教育教学部',课程类别:'院三创教育',学分:'2',教学班号:'(2025-2026-1)-13000724-01',任课教师:'超星尔雅',上课时间:'星期五第5-6节{2-17周}',上课地点:'',网课:true },
    { 序号:15, 学年:'2025-2026',学期:'1',课程名称:'思想道德与法治',开课学院:'马克思主义学院',课程类别:'公共必修课',学分:'3.5',教学班号:'(2025-2026-1)-M0000002-10',任课教师:'杨帆',上课时间:'星期二第3-4节{11-12周};星期五第9-10节{15-16周}',上课地点:'阶6;多(A-307)',网课:false },
    { 序号:16, 学年:'2025-2026',学期:'1',课程名称:'入学教育与军训',开课学院:'学工部（处）、人武部',课程类别:'实践环节',学分:'2',教学班号:'(2025-2026-1)-J0000004-82',任课教师:'陈刚',上课时间:'',上课地点:'',网课:true },
    { 序号:17, 学年:'2025-2026',学期:'1',课程名称:'篮球1',开课学院:'体育与健康管理学院',课程类别:'公共必修课',学分:'1',教学班号:'(2025-2026-1)-K0000109-03',任课教师:'黄健',上课时间:'星期四第7-8节{1-9周,11-20周}',上课地点:'体育馆201',网课:false },
    { 序号:18, 学年:'2025-2026',学期:'1',课程名称:'大学生心理健康教育（一）',开课学院:'心理健康教育中心',课程类别:'公共必修课',学分:'1.2',教学班号:'(2025-2026-1)-J0000011-44',任课教师:'徐雪萍',上课时间:'星期一第1-2节{2-19周}',上课地点:'多(B-328)',网课:false },
    { 序号:19, 学年:'2025-2026',学期:'1',课程名称:'世界古代文明（尔雅）',开课学院:'通识教育教学部',课程类别:'公共选修课',学分:'1',教学班号:'(2025-2026-1)-13000662-01',任课教师:'超星尔雅',上课时间:'',上课地点:'',网课:true },
    { 序号:20, 学年:'2025-2026',学期:'1',课程名称:'分析化学',开课学院:'检验检测认证学院',课程类别:'专业必修课',学分:'1.5',教学班号:'(2025-2026-1)-R24H0004-06',任课教师:'林强,王乾',上课时间:'星期三第9-10节{2-19周}',上课地点:'多(B-518)',网课:false },
  ],
}

// ── 内嵌范本（英文） ──────────────────────────
export const ENROLL_SAMPLE_EN: EnrollData = {
  headers: ['Academic Year','Term','Course Name','College','Category','Credits','Class Section ID','Instructor','Class Time','Classroom','Online'],
  courses: [
    { 序号:1,  学年:'2025-2026',学期:'1',课程名称:'College English (Intermediate)',开课学院:'General Education Teaching Department',课程类别:'General Required',学分:'4',教学班号:'(2025-2026-1)-T0000008-03',任课教师:'Li Hua',上课时间:'Tuesday Periods 1-2 {Weeks 2-18}; Thursday Periods 3-4 {Weeks 2-18}',上课地点:'Multimedia (B-201); Multimedia (B-201)',网课:false },
    { 序号:2,  学年:'2025-2026',学期:'1',课程名称:'AI and the Information Society (Erya)',开课学院:'General Education Teaching Department',课程类别:'General Elective',学分:'2',教学班号:'(2025-2026-1)-13000521-01',任课教师:'Superstar Erya',上课时间:'',上课地点:'',网课:true },
    { 序号:3,  学年:'2025-2026',学期:'1',课程名称:'College Mental Health Education II',开课学院:'Mental Health Education Center',课程类别:'General Required',学分:'1.5',教学班号:'(2025-2026-1)-J0000012-11',任课教师:'Wang Li',上课时间:'Monday Periods 5-6 {Weeks 2-19}',上课地点:'Multimedia (B-330)',网课:false },
    { 序号:4,  学年:'2025-2026',学期:'1',课程名称:'Social Practice',开课学院:'Student Affairs Division, People\'s Armed Forces Department',课程类别:'Practical Training',学分:'2.5',教学班号:'(2025-2026-1)-J0000005-15',任课教师:'Zhang Qiang',上课时间:'',上课地点:'',网课:true },
    { 序号:5,  学年:'2025-2026',学期:'1',课程名称:'Organic Chemistry Lab',开课学院:'College of Inspection, Testing and Certification',课程类别:'Major Required',学分:'1.5',教学班号:'(2025-2026-1)-R24H0003-02',任课教师:'Liu Yang, Chen Jing',上课时间:'Thursday Periods 9-10 {Weeks 3-18}',上课地点:'Multimedia (C-215)',网课:false },
    { 序号:6,  学年:'2025-2026',学期:'1',课程名称:'College English (3-2)',开课学院:'General Education Teaching Department',课程类别:'General Required',学分:'3',教学班号:'(2025-2026-1)-T0000047-05',任课教师:'Zhao Gang',上课时间:'Wednesday Periods 3-4 {Weeks 2-19}; Friday Periods 1-2 {Weeks 2-19}',上课地点:'Lecture Hall 4; Lecture Hall 4',网课:false },
    { 序号:7,  学年:'2025-2026',学期:'1',课程名称:'Current Affairs and Policy (6-2)',开课学院:'School of Marxism',课程类别:'General Required',学分:'0.2',教学班号:'(2025-2026-1)-M0000035-08',任课教师:'Sun Hong',上课时间:'Saturday Periods 1-2 {Weeks 4, 9, 14}',上课地点:'Multimedia (A-401)',网课:false },
    { 序号:8,  学年:'2025-2026',学期:'1',课程名称:'Entrepreneurship Practice',开课学院:'College of Innovation and Entrepreneurship',课程类别:'General Required',学分:'2.5',教学班号:'(2025-2026-1)-N0000002-06',任课教师:'Zhou Tao',上课时间:'Tuesday Periods 7-8 {Weeks 1-18}',上课地点:'Multimedia (B-204)',网课:false },
    { 序号:9,  学年:'2025-2026',学期:'1',课程名称:'Career Communication and Etiquette',开课学院:'General Education Teaching Department',课程类别:'General Required',学分:'1',教学班号:'(2025-2026-1)-T0000010-04',任课教师:'Wu Fang',上课时间:'',上课地点:'',网课:true },
    { 序号:10, 学年:'2025-2026',学期:'1',课程名称:'Mechanical Drawing',开课学院:'School of Intelligent Manufacturing',课程类别:'Major Required',学分:'4',教学班号:'(2025-2026-1)-R05H0101-01',任课教师:'Ma Chao',上课时间:'Monday Periods 9-10 {Weeks 2-19}',上课地点:'Multimedia (A-512)',网课:false },
    { 序号:11, 学年:'2025-2026',学期:'1',课程名称:'Python Basics (Online)',开课学院:'General Education Teaching Department',课程类别:'General Elective (Online)',学分:'2',教学班号:'(2025-2026-1)-G0000020-02',任课教师:'Jin Lei',上课时间:'',上课地点:'',网课:true },
    { 序号:12, 学年:'2025-2026',学期:'1',课程名称:'Advanced Mathematics (2-1)',开课学院:'General Education Teaching Department',课程类别:'General Required',学分:'5',教学班号:'(2025-2026-1)-T0000006-05',任课教师:'Zheng Li',上课时间:'Thursday Periods 5-6 {Weeks 2-19}; Tuesday Periods 1-2 {Weeks 2-19}',上课地点:'Multimedia (B-416); Multimedia (B-416)',网课:false },
    { 序号:13, 学年:'2025-2026',学期:'1',课程名称:'Public Speaking and Social Etiquette (Erya)',开课学院:'General Education Teaching Department',课程类别:'General Elective',学分:'2',教学班号:'(2025-2026-1)-13000775-01',任课教师:'Superstar Erya',上课时间:'',上课地点:'',网课:true },
    { 序号:14, 学年:'2025-2026',学期:'1',课程名称:'Innovation Competition in Practice (Erya)',开课学院:'General Education Teaching Department',课程类别:'School Entrepreneurship and Innovation Education',学分:'3',教学班号:'(2025-2026-1)-13000724-01',任课教师:'Superstar Erya',上课时间:'Friday Periods 5-6 {Weeks 2-17}',上课地点:'',网课:true },
    { 序号:15, 学年:'2025-2026',学期:'1',课程名称:'Ideological and Moral Cultivation and Rule of Law',开课学院:'School of Marxism',课程类别:'General Required',学分:'3',教学班号:'(2025-2026-1)-M0000002-10',任课教师:'Yang Fan',上课时间:'Tuesday Periods 3-4 {Weeks 11-12}; Friday Periods 9-10 {Weeks 15-16}',上课地点:'Lecture Hall 6; Multimedia (A-307)',网课:false },
    { 序号:16, 学年:'2025-2026',学期:'1',课程名称:'Freshman Orientation and Military Training',开课学院:'Student Affairs Division, People\'s Armed Forces Department',课程类别:'Practical Training',学分:'2',教学班号:'(2025-2026-1)-J0000004-82',任课教师:'Chen Gang',上课时间:'',上课地点:'',网课:true },
    { 序号:17, 学年:'2025-2026',学期:'1',课程名称:'Basketball 1',开课学院:'School of Physical Education and Health Management',课程类别:'General Required',学分:'1',教学班号:'(2025-2026-1)-K0000109-03',任课教师:'Huang Jian',上课时间:'Thursday Periods 7-8 {Weeks 1-9, 11-20}',上课地点:'Gymnasium 201',网课:false },
    { 序号:18, 学年:'2025-2026',学期:'1',课程名称:'College Mental Health Education I',开课学院:'Mental Health Education Center',课程类别:'General Required',学分:'1.5',教学班号:'(2025-2026-1)-J0000011-44',任课教师:'Xu Xueping',上课时间:'Monday Periods 1-2 {Weeks 2-19}',上课地点:'Multimedia (B-328)',网课:false },
    { 序号:19, 学年:'2025-2026',学期:'1',课程名称:'Ancient World Civilizations (Erya)',开课学院:'General Education Teaching Department',课程类别:'General Elective',学分:'2',教学班号:'(2025-2026-1)-13000662-01',任课教师:'Superstar Erya',上课时间:'',上课地点:'',网课:true },
    { 序号:20, 学年:'2025-2026',学期:'1',课程名称:'Analytical Chemistry',开课学院:'College of Inspection, Testing and Certification',课程类别:'Major Required',学分:'1.5',教学班号:'(2025-2026-1)-R24H0004-06',任课教师:'Lin Qiang, Wang Qian',上课时间:'Wednesday Periods 9-10 {Weeks 2-19}',上课地点:'Multimedia (B-518)',网课:false },
  ],
}

// ── 纯函数 ────────────────────────────────────

/** 深拷贝选课数据 */
export function cloneEnroll(src: EnrollData): EnrollData {
  return {
    headers: src.headers.slice(),
    courses: src.courses.map((c) => ({ ...c })),
  }
}

/**
 * 根据语言返回默认内嵌范本。
 * lang 为 'en' 时返回英文范本，否则返回中文范本。
 */
export function createDefaultEnroll(lang: string): EnrollData {
  return cloneEnroll(lang === 'en' ? ENROLL_SAMPLE_EN : ENROLL_DEFAULT)
}

/**
 * 网课判定规则（中英文通用）：
 * - 条件B：上课时间和上课地点均为空 → 网课
 * - 条件A中文：课程名含括号且类别含"选修" → 网课
 * - 条件A英文：课程名含()且类别含"Elective" → 网课
 */
export function inferOnlineFlag(
  courseName: string,
  courseCategory: string,
  classTime: string,
  classPlace: string,
): boolean {
  const name = courseName != null ? String(courseName).trim() : ''
  const category = courseCategory != null ? String(courseCategory).trim() : ''
  const time = classTime != null ? String(classTime).trim() : ''
  const place = classPlace != null ? String(classPlace).trim() : ''
  if (!time && !place) return true
  if (/[（(]/.test(name) && category.includes('选修')) return true
  if (/\(/.test(name) && /elective/i.test(category)) return true
  // 关键字检测
  const nameLower = name.toLowerCase()
  const catLower = category.toLowerCase()
  for (const kw of ONLINE_COURSE_KEYWORDS) {
    if (nameLower.includes(kw) || catLower.includes(kw)) return true
  }
  return false
}

/**
 * 旧数据补「网课」列与布尔字段，移除已废弃的「课程代号」列。
 * 直接修改传入对象（与原代码行为一致）。
 */
export function normalizeEnrollShape(
  data: EnrollData,
  options?: { restoredFromStorage?: boolean },
): void {
  if (!data || !Array.isArray(data.headers) || !Array.isArray(data.courses)) return
  const opts = options ?? {}
  data.headers = data.headers.filter((h) => h !== '课程代号')
  if (!data.headers.includes('网课')) {
    data.headers.push('网课')
  }
  data.courses = data.courses.map((c) => {
    const o = { ...c }
    if (typeof o.网课 !== 'boolean') {
      o.网课 = parseOnlineField(o.网课)
    }
    if (opts.restoredFromStorage && o.网课来源 == null) {
      o.网课来源 = 'none'
    }
    return o
  })
}

/**
 * 为课程列表分配唯一序号（去重、补全），并确保 网课 字段为布尔值。
 * 返回新数组，不修改原数组。
 */
export function finalizeCourseIndices(courses: Course[]): Course[] {
  const used = new Set<number>()
  let auto = 1
  return courses.map((c) => {
    const o = { ...c }
    let n =
      typeof o.序号 === 'number'
        ? o.序号
        : parseInt(String(o.序号 == null ? '' : o.序号).trim(), 10)
    if (!Number.isFinite(n) || n < 1 || used.has(n)) {
      while (used.has(auto)) auto++
      n = auto
      auto++
    }
    used.add(n)
    o.序号 = n
    o.网课 = parseOnlineField(o.网课)
    return o
  })
}

/**
 * 从教务固定格式 xlsx AoA（无表头，10列）解析课程列表。
 * 返回 Course[] 或 null（格式不符）。
 */
export function parseEnrollAoaFixedNoHeader(aoa: unknown[][]): Course[] | null {
  const H = ENROLL_DEFAULT.headers.slice()
  const fixed = ENROLL_XLSX_FIXED_COLS
  const courses: Course[] = []
  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r] ?? []
    const normalized = fixed.map((_key, i) => normalizeCell((row as unknown[])[i]))
    const maybeName = normalized[2] ?? ''
    const maybeYear = normalized[0] ?? ''
    const maybeTerm = normalized[1] ?? ''
    const hasEnoughShape =
      normalized.some(Boolean) &&
      maybeName &&
      /^\d{4}\s*-\s*\d{4}$/.test(maybeYear) &&
      /^[12]$/.test(maybeTerm)
    if (!rowLooksLikeFixedXlsxDataRow(row as unknown[]) && !hasEnoughShape) continue
    const rowObj: Record<string, unknown> = {}
    for (const h of H) rowObj[h] = ''
    fixed.forEach((key, i) => { rowObj[key] = normalized[i] })
    rowObj['上课地点'] = normalizeCell(rowObj['上课地点']).replace(/\s+\)/g, ')')
    rowObj['网课'] = inferOnlineFlag(
      String(rowObj['课程名称'] ?? ''),
      String(rowObj['课程类别'] ?? ''),
      String(rowObj['上课时间'] ?? ''),
      String(rowObj['上课地点'] ?? ''),
    )
    rowObj['网课来源'] = 'auto'
    courses.push(rowObj as unknown as Course)
  }
  if (!courses.length) return null
  return finalizeCourseIndices(courses)
}

// ── 内部辅助 ──────────────────────────────────

function rowLooksLikeFixedXlsxDataRow(row: unknown[]): boolean {
  const c0 = normalizeCell(row[0])
  const c1 = normalizeCell(row[1])
  const c2 = normalizeCell(row[2])
  if (!c2 || c2 === '课程名称' || c2 === '课程名') return false
  if (!/^\d{4}\s*-\s*\d{4}$/.test(c0)) return false
  if (!/^[12]$/.test(c1)) return false
  return true
}
