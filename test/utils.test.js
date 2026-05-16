import { describe, it, expect } from 'vitest';
import { splitCellBands } from '../src/utils.js';

describe('splitCellBands (格子拆分)', () => {
  it('应该正确拆分 "1|2|3"', () => {
    expect(splitCellBands('1|2|3')).toEqual(['1', '2', '3']);
  });

  it('应该把 "1" 拆成 ["1","",""]', () => {
    expect(splitCellBands('1')).toEqual(['1', '', '']);
  });

  it('应该把空字符串拆成 ["","",""]', () => {
    expect(splitCellBands('')).toEqual(['', '', '']);
  });

  it('应该支持空格分隔的数字 "1 2 3"', () => {
    expect(splitCellBands('1 2 3')).toEqual(['1', '2', '3']);
  });
});
