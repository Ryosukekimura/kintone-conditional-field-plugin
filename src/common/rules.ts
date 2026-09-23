import type { Operator, RecordLike, Rule } from './types';

/** 値を必要としない比較方法 */
export const VALUELESS_OPERATORS: readonly Operator[] = ['isEmpty', 'isNotEmpty'];

/**
 * フィールド値を文字列配列にそろえる。
 * 単一値（文字列・数値）は要素1つの配列、空値は空配列になる。
 */
export function toValues(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)))
      .filter((v) => v !== '');
  }
  const text = String(value);
  return text === '' ? [] : [text];
}

export function isEmptyValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim() === '';
  return toValues(value).length === 0;
}

export function evaluateCondition(operator: Operator, expected: string, actual: unknown): boolean {
  const values = toValues(actual);
  switch (operator) {
    case 'equals':
      return expected === '' ? values.length === 0 : values.length === 1 && values[0] === expected;
    case 'notEquals':
      return !evaluateCondition('equals', expected, actual);
    case 'includes':
      return values.includes(expected);
    case 'notIncludes':
      return !values.includes(expected);
    case 'isEmpty':
      return isEmptyValue(actual);
    case 'isNotEmpty':
      return !isEmptyValue(actual);
  }
}

export function isRuleMatched(rule: Rule, record: RecordLike): boolean {
  return evaluateCondition(rule.operator, rule.value, record[rule.conditionField]?.value);
}

/**
 * 各表示対象フィールドを表示するかどうか。
 * 同じフィールドが複数のルールの対象なら、どれか1つでも条件を満たせば表示する（OR）。
 */
export function computeVisibility(rules: Rule[], record: RecordLike): Map<string, boolean> {
  const visibility = new Map<string, boolean>();
  for (const rule of rules) {
    const matched = isRuleMatched(rule, record);
    for (const field of rule.showFields) {
      visibility.set(field, (visibility.get(field) ?? false) || matched);
    }
  }
  return visibility;
}

/** 必須にするフィールド。非表示のフィールドは入力できないので必須にしない。 */
export function computeRequired(rules: Rule[], record: RecordLike): Set<string> {
  const visibility = computeVisibility(rules, record);
  const required = new Set<string>();
  for (const rule of rules) {
    if (!isRuleMatched(rule, record)) continue;
    for (const field of rule.requireFields) {
      if (visibility.get(field) !== false) required.add(field);
    }
  }
  return required;
}

/** 必須なのに未入力のフィールドを返す */
export function findMissingRequired(rules: Rule[], record: RecordLike): string[] {
  return [...computeRequired(rules, record)].filter(
    (field) => record[field] !== undefined && isEmptyValue(record[field]?.value),
  );
}

/** 変更を監視すべき条件フィールド（重複なし） */
export function conditionFields(rules: Rule[]): string[] {
  return [...new Set(rules.map((r) => r.conditionField))];
}

/** すべてのルールの対象フィールド（重複なし） */
export function targetFields(rules: Rule[]): string[] {
  return [...new Set(rules.flatMap((r) => [...r.showFields, ...r.requireFields]))];
}
