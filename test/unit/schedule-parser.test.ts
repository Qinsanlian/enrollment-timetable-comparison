import { describe, it, expect } from 'vitest'
import {
  parseOneScheduleSegment,
  parseCourseToSchedulePlacements,
  parseWeekdayKeyInText,
  weekHintForCell,
} from '../../course-timetable/src/core/schedule-parser'

// 模拟一个课程对象（仅用于 parseCourseToSchedulePlacements 和 weekHintForCell）
const mockCourse = (上课时间: string) => ({ 上课时间 } as any)

describe('parseWeekdayKeyInText', () => {
  it('识别中文“星期一” → mon', () => {
    expect(parseWeekdayKeyInText('星期一第1-2节')).toBe('mon')
  })
  it('识别中文“周天” → sun', () => {
    expect(parseWeekdayKeyInText('周天第3-4节')).toBe('sun')
  })
  it('识别英文“Monday” → mon', () => {
    expect(parseWeekdayKeyInText('Monday Periods 1-2')).toBe('mon')
  })
  it('无星期信息返回 null', () => {
    expect(parseWeekdayKeyInText('第1-2节')).toBe(null)
  })
})

describe('parseOneScheduleSegment', () => {
  it('解析中文单段', () => {
    const result = parseOneScheduleSegment('星期三第3-4节{2-19周}')
    expect(result).toEqual([{ dayKey: 'wed', slotKey: 'p34', weekPattern: '2-19周' }])
  })

  it('解析英文单段', () => {
    const result = parseOneScheduleSegment('Friday Periods 9-10 {Weeks 3-18}')
    expect(result).toEqual([{ dayKey: 'fri', slotKey: 'p910', weekPattern: '3-18周' }])
  })

  it('解析包含“单周”的周次', () => {
    const result = parseOneScheduleSegment('星期二第7-8节{1-15周单周}')
    expect(result[0].weekPattern).toBe('1-15周（单周）')
  })

  it('解析多段（分号分隔）', () => {
    const input = '星期四第5-6节{2-19周};星期五第1-2节{2-19周}'
    const result = parseOneScheduleSegment(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ dayKey: 'thu', slotKey: 'p56' })
    expect(result[1]).toMatchObject({ dayKey: 'fri', slotKey: 'p12' })
  })

  it('解析跨节次范围（如“第1-4节”）应覆盖多个 slotKey', () => {
    const result = parseOneScheduleSegment('星期一第1-4节')
    // 第1-4节应覆盖 p12 (1-2节) 和 p34 (3-4节)
    expect(result.map(p => p.slotKey).sort()).toEqual(['p12', 'p34'])
  })
})

describe('parseCourseToSchedulePlacements', () => {
  it('从课程上课时间提取所有格子位置（去重）', () => {
    const course = mockCourse('星期二第1-2节{2-18周};星期二第3-4节{2-18周}')
    const placements = parseCourseToSchedulePlacements(course)
    // 应该得到两个不同的格子：tue-p12 和 tue-p34
    expect(placements).toHaveLength(2)
    expect(placements[0]).toMatchObject({ dayKey: 'tue', slotKey: 'p12' })
    expect(placements[1]).toMatchObject({ dayKey: 'tue', slotKey: 'p34' })
  })

  it('同一格重复的时间段应去重', () => {
    const course = mockCourse('星期一第1-2节{2-18周};星期一第1-2节{2-18周}')
    const placements = parseCourseToSchedulePlacements(course)
    expect(placements).toHaveLength(1)
  })
})

describe('weekHintForCell', () => {
  it('返回指定格子的周次提示', () => {
    const course = mockCourse('星期四第5-6节{3-16周}')
    const hint = weekHintForCell(course, 'thu', 'p56')
    expect(hint).toBe('3-16周')
  })

  it('无匹配时返回空字符串', () => {
    const course = mockCourse('星期四第5-6节{3-16周}')
    const hint = weekHintForCell(course, 'mon', 'p12')
    expect(hint).toBe('')
  })
})
