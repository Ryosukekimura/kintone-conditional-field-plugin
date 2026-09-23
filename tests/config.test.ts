import { describe, expect, it } from 'vitest';
import { EMPTY_CONFIG, parseConfig, serializeConfig, validateConfig } from '../src/common/config';
import type { PluginConfig, Rule } from '../src/common/types';

const validRule: Rule = {
  id: '1',
  conditionField: '種別',
  operator: 'equals',
  value: '法人',
  showFields: ['法人名'],
  requireFields: [],
};

describe('parseConfig / serializeConfig', () => {
  it('保存した設定をそのまま読み戻せる', () => {
    const config: PluginConfig = { version: 1, rules: [validRule] };
    expect(parseConfig(serializeConfig(config))).toEqual(config);
  });

  it('未設定・壊れた JSON は空の設定として扱う', () => {
    expect(parseConfig({})).toEqual(EMPTY_CONFIG);
    expect(parseConfig(null)).toEqual(EMPTY_CONFIG);
    expect(parseConfig({ config: '{壊れた' })).toEqual(EMPTY_CONFIG);
  });

  it('形式の正しくないルールだけを読み飛ばす', () => {
    const raw = { config: JSON.stringify({ rules: [validRule, { id: 2 }, { ...validRule, operator: '?' }] }) };
    expect(parseConfig(raw).rules).toEqual([validRule]);
  });
});

describe('validateConfig', () => {
  const check = (rule: Partial<Rule>, fields?: string[]) =>
    validateConfig({ version: 1, rules: [{ ...validRule, ...rule }] }, fields && new Set(fields));

  it('正しいルールはエラーなし', () => {
    expect(check({}, ['種別', '法人名'])).toEqual([]);
  });

  it('条件の項目が未選択', () => {
    expect(check({ conditionField: '' })).toEqual(['ルール1: 条件の項目を選んでください']);
  });

  it('値が必要な比較方法で値が空', () => {
    expect(check({ value: '' })).toEqual(['ルール1: 条件の値を入力してください']);
    expect(check({ operator: 'isEmpty', value: '' })).toEqual([]);
  });

  it('対象の項目がない', () => {
    expect(check({ showFields: [] })).toEqual(['ルール1: 表示または必須にする項目を1つ以上選んでください']);
  });

  it('条件の項目自身を対象にしている', () => {
    expect(check({ showFields: ['種別'] })).toEqual(['ルール1: 条件の項目自身は対象にできません']);
  });

  it('アプリから削除された項目を参照している', () => {
    expect(check({}, ['種別'])).toEqual(['ルール1: アプリに存在しない項目があります（法人名）']);
  });
});
