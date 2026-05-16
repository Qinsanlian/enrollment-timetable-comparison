import { describe, it, expect } from 'vitest'
import {
  parseTimeHmToMinutes,
  formatMinutesToHm,
  addMinutes,
  normalizeSlotParams,
  computeSlotTimes,
} from '../../course-timetable/src/core/slot-times'

describe('parseTimeHmToMinutes', () => {
  it('解析 "08:00" → 480', () => {
    expect(parseTimeHmToMinutes('08:00')).toBe(480)
  })
  it('解析 "23:59" → 1439', () => {
    expect(parseTimeHmToMinutes('23:59')).toBe(1439)
  })
  it('无效格式返回 null', () => {
    expect(parseTimeHmToMinutes('25:00')).toBe(null)
    expect(parseTimeHmToMinutes('08-00')).toBe(null)
    expect(parseTimeHmToMinutes('')).toBe(null)
  })
})

describe('formatMinutesToHm', () => {
  it('480 → "08:00"', () => {
    expect(formatMinutesToHm(480)).toBe('08:00')
  })
  it('1439 → "23:59"', () => {
    expect(formatMinutesToHm(1439)).toBe('23:59')
  })
  it('负数或超出范围会回绕', () => {
    expect(formatMinutesToHm(-1)).toBe('23:59')
    expect(formatMinutesToHm(1440)).toBe('00:00')
  })
})

describe('addMinutes', () => {
  it('480 + 45 = 525', () => {
    expect(addMinutes(480, 45)).toBe(525)
  })
  it('处理负数', () => {
    expect(addMinutes(30, -10)).toBe(20)
  })
})

describe('normalizeSlotParams', () => {
  const defaults = { startTime: '08:00', lessonMin: 45, breakInnerMin: 5, breakAfterMin: 10, noonMin: 90, eveningMin: 60 }

  it('补全缺失字段为默认值', () => {
    const result = normalizeSlotParams({})
    expect(result).toEqual(defaults)
  })

  it('修正非法 lessonMin 为最小值 1', () => {
    const result = normalizeSlotParams({ lessonMin: -10 })
    expect(result.lessonMin).toBe(1)
  })

  it('无效 startTime 重置为默认 "08:00"', () => {
    const result = normalizeSlotParams({ startTime: 'invalid' })
    expect(result.startTime).toBe('08:00')
  })
})

describe('computeSlotTimes', () => {
  it('使用默认配置计算时间段', () => {
    const params = { startTime: '08:00', lessonMin: 45, breakInnerMin: 5, breakAfterMin: 10, noonMin: 90, eveningMin: 60 }
    const times = computeSlotTimes(params)
    expect(times.p12).toBe('08:00～09:35')
    expect(times.p34).toBe('09:45～11:20')
    expect(times.p56).toBe('12:50～14:25')
    expect(times.p78).toBe('14:35～16:10')
    expect(times.p910).toBe('17:10～18:45')
    expect(times.p1112).toBe('18:55～20:30')
  })

  it('自定义参数', () => {
    const params = { startTime: '09:00', lessonMin: 50, breakInnerMin: 10, breakAfterMin: 15, noonMin: 120, eveningMin: 30 }
    const times = computeSlotTimes(params)
    expect(times.p12).toBe('09:00～10:50')   // 50*2+10 = 110 min
    expect(times.p34).toBe('11:05～12:55')   // +15 = 11:05
    expect(times.p56).toBe('14:55～16:45')   // +120 = 14:55
    expect(times.p78).toBe('17:00～18:50')
    expect(times.p910).toBe('19:20～21:10')  // +30 = 19:20
    expect(times.p1112).toBe('21:25～23:15')
  })

  it('无效 startTime 时返回默认占位符', () => {
    const params = { startTime: 'invalid', lessonMin: 45, breakInnerMin: 5, breakAfterMin: 10, noonMin: 90, eveningMin: 60 }
    const times = computeSlotTimes(params)
    expect(times.p12).toBe('(xx:xx~xx:xx)')
    expect(times.p34).toBe('(xx:xx~xx:xx)')
  })
})
