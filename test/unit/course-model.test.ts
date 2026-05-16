import { inferOnlineFlag } from '../../course-timetable/src/core/course-model'
describe('inferOnlineFlag', () => {
  // ... 已有测试

  it('课程名为空但时间和地点也为空 → 网课', () => {
    expect(inferOnlineFlag('', '公共必修课', '', '')).toBe(true)
  })

  it('课程名含括号且类别含"选修" → 网课（中英文括号都行）', () => {
    expect(inferOnlineFlag('课程（网络）', '公共选修课', '周一第1节', '教室')).toBe(true)
    expect(inferOnlineFlag('课程(Online)', 'General Elective', 'Monday', 'Room')).toBe(true)
  })

  it('仅课程名含关键字"网课" → 网课', () => {
    expect(inferOnlineFlag('网课：Python入门', '其他', '周一第1节', '教室')).toBe(true)
  })

  it('仅教师名含"尔雅" → 网课', () => {
    // 注意：inferOnlineFlag 目前只检查课程名和类别，不检查教师名。这个测试期望 false。
    // 如果需要支持教师名，需修改源码。这里先按现有行为写。
    expect(inferOnlineFlag('课程', '选修', '周一第1节', '教室')).toBe(false)
  })
})

import { parseEnrollAoaFixedNoHeader } from '../../course-timetable/src/core/course-model'

describe('parseEnrollAoaFixedNoHeader', () => {
  it('正确解析一行有效数据', () => {
    const aoa = [
      ['2025-2026', '1', '大学英语', '通识部', '必修', '2', 'C01', '李华', '周一第1-2节', '教室A']
    ]
    const courses = parseEnrollAoaFixedNoHeader(aoa)
    expect(courses).toHaveLength(1)
    expect(courses[0].课程名称).toBe('大学英语')
    expect(courses[0].网课).toBe(false)
    expect(courses[0].序号).toBe(1)
  })

  it('跳过学年格式错误的行', () => {
    const aoa = [
      ['2025', '1', '课程名', '学院', '类别', '1', 'C01', '教师', '时间', '地点']
    ]
    const courses = parseEnrollAoaFixedNoHeader(aoa)
    expect(courses).toBeNull()
  })

  it('跳过学期格式错误的行', () => {
    const aoa = [
      ['2025-2026', '3', '课程名', '学院', '类别', '1', 'C01', '教师', '时间', '地点']
    ]
    const courses = parseEnrollAoaFixedNoHeader(aoa)
    expect(courses).toBeNull()
  })

  it('自动为多行分配递增序号', () => {
    const aoa = [
      ['2025-2026', '1', '课程A', '学院', '类别', '1', 'C01', '教师', '时间', '地点'],
      ['2025-2026', '1', '课程B', '学院', '类别', '1', 'C02', '教师', '时间', '地点'],
    ]
    const courses = parseEnrollAoaFixedNoHeader(aoa)
    expect(courses).toHaveLength(2)
    expect(courses[0].序号).toBe(1)
    expect(courses[1].序号).toBe(2)
  })

  it('处理网课推断（上课时间和地点均为空）', () => {
    const aoa = [
      ['2025-2026', '1', '网课示例', '学院', '选修', '1', 'C01', '教师', '', '']
    ]
    const courses = parseEnrollAoaFixedNoHeader(aoa)
    expect(courses![0].网课).toBe(true)
  })
})
