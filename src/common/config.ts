import { VALUELESS_OPERATORS } from './rules';
import type { Operator, PluginConfig, Rule } from './types';

const CONFIG_KEY = 'config';

const OPERATORS: readonly Operator[] = [
  'equals',
  'notEquals',
  'includes',
  'notIncludes',
  'isEmpty',
  'isNotEmpty',
];

export const EMPTY_CONFIG: PluginConfig = { version: 1, rules: [] };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function parseRule(raw: unknown): Rule | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== 'string' ||
    typeof r.conditionField !== 'string' ||
    !OPERATORS.includes(r.operator as Operator) ||
    typeof r.value !== 'string' ||
    !isStringArray(r.showFields) ||
    !isStringArray(r.requireFields)
  ) {
    return null;
  }
  return {
    id: r.id,
    conditionField: r.conditionField,
    operator: r.operator as Operator,
    value: r.value,
    showFields: r.showFields,
    requireFields: r.requireFields,
  };
}

/** kintone に保存された設定（文字列の連想配列）を読み込む。壊れたルールは読み飛ばす。 */
export function parseConfig(raw: Record<string, string> | null | undefined): PluginConfig {
  const json = raw?.[CONFIG_KEY];
  if (!json) return EMPTY_CONFIG;
  try {
    const data = JSON.parse(json) as { rules?: unknown };
    const rules = Array.isArray(data.rules)
      ? data.rules.map(parseRule).filter((r): r is Rule => r !== null)
      : [];
    return { version: 1, rules };
  } catch {
    return EMPTY_CONFIG;
  }
}

export function serializeConfig(config: PluginConfig): Record<string, string> {
  return { [CONFIG_KEY]: JSON.stringify(config) };
}

/**
 * 保存前のチェック。問題があればルールの番号付きでメッセージを返す。
 * existingFields を渡すと、アプリから削除されたフィールドへの参照も検出する。
 */
export function validateConfig(config: PluginConfig, existingFields?: Set<string>): string[] {
  const errors: string[] = [];
  config.rules.forEach((rule, i) => {
    const label = `ルール${i + 1}`;
    if (!rule.conditionField) {
      errors.push(`${label}: 条件の項目を選んでください`);
    }
    if (!VALUELESS_OPERATORS.includes(rule.operator) && rule.value === '') {
      errors.push(`${label}: 条件の値を入力してください`);
    }
    if (rule.showFields.length === 0 && rule.requireFields.length === 0) {
      errors.push(`${label}: 表示または必須にする項目を1つ以上選んでください`);
    }
    const targets = [...rule.showFields, ...rule.requireFields];
    if (rule.conditionField && targets.includes(rule.conditionField)) {
      errors.push(`${label}: 条件の項目自身は対象にできません`);
    }
    if (existingFields) {
      const missing = [rule.conditionField, ...targets].filter(
        (f) => f && !existingFields.has(f),
      );
      if (missing.length > 0) {
        errors.push(`${label}: アプリに存在しない項目があります（${[...new Set(missing)].join(', ')}）`);
      }
    }
  });
  return errors;
}
