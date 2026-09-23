import { describe, expect, it } from 'vitest';
import {
  computeRequired,
  computeVisibility,
  conditionFields,
  evaluateCondition,
  findMissingRequired,
  isEmptyValue,
} from '../src/common/rules';
import type { RecordLike, Rule } from '../src/common/types';

const rule = (overrides: Partial<Rule>): Rule => ({
  id: 'r',
  conditionField: '種別',
  operator: 'equals',
  value: '法人',
  showFields: [],
  requireFields: [],
  ...overrides,
});

const record = (values: Record<string, unknown>): RecordLike =>
  Object.fromEntries(Object.entries(values).map(([k, value]) => [k, { value }]));

describe('evaluateCondition', () => {
  it.each([
    ['equals', '法人', '法人', true],
    ['equals', '法人', '個人', false],
    ['equals', '', '', true],
    ['notEquals', '法人', '個人', true],
    ['notEquals', '法人', '法人', false],
    ['includes', 'A', ['A', 'B'], true],
    ['includes', 'C', ['A', 'B'], false],
    ['notIncludes', 'C', ['A', 'B'], true],
    ['isEmpty', '', '', true],
    ['isEmpty', '', '   ', true],
    ['isEmpty', '', [], true],
    ['isEmpty', '', undefined, true],
    ['isEmpty', '', 'x', false],
    ['isNotEmpty', '', ['A'], true],
    ['isNotEmpty', '', null, false],
  ] as const)('%s %j に対して %j は %s', (op, expected, actual, result) => {
    expect(evaluateCondition(op, expected, actual)).toBe(result);
  });

  it('複数選択の値を equals で比べると、ちょうど1つ選ばれているときだけ一致する', () => {
    expect(evaluateCondition('equals', 'A', ['A'])).toBe(true);
    expect(evaluateCondition('equals', 'A', ['A', 'B'])).toBe(false);
  });

  it('数値フィールドの値（文字列）と比べられる', () => {
    expect(evaluateCondition('equals', '10', '10')).toBe(true);
  });
});

describe('isEmptyValue', () => {
  it('ファイル・ユーザー選択などのオブジェクト配列も判定できる', () => {
    expect(isEmptyValue([])).toBe(true);
    expect(isEmptyValue([{ code: 'user1', name: 'ユーザー1' }])).toBe(false);
  });
});

describe('computeVisibility', () => {
  it('条件を満たすと表示、満たさないと非表示にする', () => {
    const rules = [rule({ showFields: ['法人名', '担当部署'] })];
    expect(computeVisibility(rules, record({ 種別: '法人' }))).toEqual(
      new Map([
        ['法人名', true],
        ['担当部署', true],
      ]),
    );
    expect(computeVisibility(rules, record({ 種別: '個人' }))).toEqual(
      new Map([
        ['法人名', false],
        ['担当部署', false],
      ]),
    );
  });

  it('複数ルールの対象になっている項目は、どれか1つでも満たせば表示する', () => {
    const rules = [
      rule({ id: '1', value: '法人', showFields: ['住所'] }),
      rule({ id: '2', value: '個人事業主', showFields: ['住所'] }),
    ];
    expect(computeVisibility(rules, record({ 種別: '個人事業主' })).get('住所')).toBe(true);
    expect(computeVisibility(rules, record({ 種別: '個人' })).get('住所')).toBe(false);
  });

  it('対象になっていない項目には触れない', () => {
    const rules = [rule({ requireFields: ['電話番号'] })];
    expect(computeVisibility(rules, record({ 種別: '法人' })).size).toBe(0);
  });
});

describe('computeRequired / findMissingRequired', () => {
  const rules = [rule({ requireFields: ['法人名'] })];

  it('条件を満たすときだけ必須にする', () => {
    expect(computeRequired(rules, record({ 種別: '法人' }))).toEqual(new Set(['法人名']));
    expect(computeRequired(rules, record({ 種別: '個人' }))).toEqual(new Set());
  });

  it('必須なのに未入力の項目を返す', () => {
    expect(findMissingRequired(rules, record({ 種別: '法人', 法人名: '' }))).toEqual(['法人名']);
    expect(findMissingRequired(rules, record({ 種別: '法人', 法人名: '株式会社A' }))).toEqual([]);
    expect(findMissingRequired(rules, record({ 種別: '個人', 法人名: '' }))).toEqual([]);
  });

  it('別のルールで非表示になっている項目は必須にしない', () => {
    const mixed = [
      rule({ id: '1', conditionField: '種別', value: '法人', requireFields: ['法人名'] }),
      rule({ id: '2', conditionField: '詳細入力', value: 'する', showFields: ['法人名'] }),
    ];
    const r = record({ 種別: '法人', 詳細入力: 'しない', 法人名: '' });
    expect(findMissingRequired(mixed, r)).toEqual([]);
  });

  it('レコードに存在しない項目は無視する', () => {
    expect(findMissingRequired(rules, record({ 種別: '法人' }))).toEqual([]);
  });
});

describe('conditionFields', () => {
  it('条件の項目を重複なく返す', () => {
    const rules = [rule({ id: '1' }), rule({ id: '2' }), rule({ id: '3', conditionField: '地域' })];
    expect(conditionFields(rules)).toEqual(['種別', '地域']);
  });
});
