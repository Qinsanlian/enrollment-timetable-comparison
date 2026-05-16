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
    expect(parseTimeHmToMinutes('abc')).toBeNull()
    expect(parseTimeHmToMinutes('25:00')).toBeNull()
    expect(parseTimeHmToMinutes('08:60')).toBeNull()
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
    expect(formatMinutesToHm(-1)).toBe('23:59')   // -1 分钟 → 23:59
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
  it('补全缺失字段为默认值', () => {
    const result = normalizeSlotParams({ startTime: '09:00' })
    expect(result.startTime).toBe('09:00')
    expect(result.lessonMin).toBe(45)   // 默认
    expect(result.breakInnerMin).toBe(5)
    // ... 其他默认值
  })

  it('修正非法 lessonMin 为最小值 1', () => {
    const result = normalizeSlotParams({ lessonMin: 0 })
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
  expect(times.p12).toBe('08:00～09:35')   // 08:00 + 95 = 09:35
  expect(times.p34).toBe('09:45～11:20')   // 09:35 + 10 = 09:45, +95 = 11:20
  expect(times.p56).toBe('12:50～14:25')   // 11:20 + 90 = 12:50, +95 = 14:25
  expect(times.p78).toBe('14:35～16:10')   // 14:25 + 10 = 14:35, +95 = 16:10
  expect(times.p910).toBe('17:10～18:45')  // 16:10 + 60 = 17:10, +95 = 18:45
  expect(times.p1112).toBe('18:55～20:30') // 18:45 + 10 = 18:55, +95 = 20:30
})
    // 可以继续验证其他课次，但主要检查格式是否正确且无异常
  })

  it('自定义参数', () => {
    const params = {
      startTime: '09:00',
      lessonMin: 30,
      breakInnerMin: 0,
      breakAfterMin: 5,
      noonMin: 60,
      eveningMin: 30,
    }
    const times = computeSlotTimes(params)
    // 大致验证第一节课
    expect(times.p12).toMatch(/^\d{2}:\d{2}～\d{2}:\d{2}$/)
    expect(times.p12).not.toBe('(xx:xx~xx:xx)')
  })

  it('无效 startTime 时返回默认占位符', () => {
    const params = { startTime: 'invalid', lessonMin: 45 }
    const times = computeSlotTimes(params)
    expect(times.p12).toBe('(xx:xx~xx:xx)')
    expect(times.p34).toBe('(xx:xx~xx:xx)')
  })
})
