import { describe, it, expect } from 'vitest'
import { computeAutofill } from '../../course-timetable/src/core/autofill'
import { createDefaultEnroll } from '../../course-timetable/src/core/course-model'

describe('集成测试：自动填格', () => {
  it('课程按上课时间填入正确格子（可能合并多门课）', () => {
    const enroll = createDefaultEnroll('zh')
    // 假设第一门课是 99，第二门课是 18，都落在星期一第1-2节
    const courses = [
      { ...enroll.courses[0], 上课时间: '星期一第1-2节', 序号: 99, 网课: false },
      { ...enroll.courses[1], 上课时间: '星期一第1-2节', 序号: 18, 网课: false },
    ]
    const initialGrid = {}
    const { newGrid } = computeAutofill(courses, initialGrid)

    // 实际行为：先填 99 到上栏，再填 18 到下栏 => 存储格式 "99|18"
    expect(newGrid['mon-p12']).toBe('99|18')
  })

  it('同一格已有上栏时，填入下栏', () => {
    const courses = [
      { 序号: 1, 上课时间: '星期一第1-2节', 网课: false } as any,
      { 序号: 2, 上课时间: '星期一第1-2节', 网课: false } as any,
    ]
    const initialGrid = {}
    const { newGrid } = computeAutofill(courses, initialGrid)
    // 第一门填上栏，第二门填下栏 => "1|2"
    expect(newGrid['mon-p12']).toBe('1|2')
  })
})
