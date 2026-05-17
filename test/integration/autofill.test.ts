import { describe, it, expect } from 'vitest'
import { computeAutofill } from '../../course-timetable/src/core/autofill'
import { createDefaultEnroll } from '../../course-timetable/src/core/course-model'
import { splitCellBands } from '../../course-timetable/src/utils/helpers'

describe('集成测试：自动填格', () => {
  it('课程按上课时间填入正确格子（可能合并多门课）', () => {
    const enroll = createDefaultEnroll('zh')
    const courses = [
      { ...enroll.courses[0], 上课时间: '星期一第1-2节', 序号: 99, 网课: false },
      { ...enroll.courses[1], 上课时间: '星期一第1-2节', 序号: 18, 网课: false },
    ]
    const initialGrid = {}
    const { newGrid } = computeAutofill(courses, initialGrid)

    const [top, middle, bottom] = splitCellBands(newGrid['mon-p12'] || '')
    expect(top).toBe('99')
    expect(middle).toBe('18')   // ← 第二门填中栏
    expect(bottom).toBe('')      // ← 下栏仍为空
  })

  it('同一格已有上栏时，填入下栏', () => {
    const courses = [
      { 序号: 1, 上课时间: '星期一第1-2节', 网课: false } as any,
      { 序号: 2, 上课时间: '星期一第1-2节', 网课: false } as any,
    ]
    const initialGrid = {}
    const { newGrid } = computeAutofill(courses, initialGrid)

    const [top, middle, bottom] = splitCellBands(newGrid['mon-p12'] || '')
    expect(top).toBe('1')
    expect(middle).toBe('2')   // ← 中栏
    expect(bottom).toBe('')
  })
})
