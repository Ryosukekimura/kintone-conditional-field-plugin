/** 条件の比較方法 */
export type Operator =
  | 'equals'
  | 'notEquals'
  | 'includes'
  | 'notIncludes'
  | 'isEmpty'
  | 'isNotEmpty';

/**
 * 1つのルール。
 * 「conditionField が operator value を満たすとき、showFields を表示し requireFields を必須にする」
 */
export interface Rule {
  id: string;
  conditionField: string;
  operator: Operator;
  value: string;
  /** 条件を満たすときだけ表示する項目（満たさないときは非表示） */
  showFields: string[];
  /** 条件を満たすときだけ必須にする項目 */
  requireFields: string[];
}

export interface PluginConfig {
  version: 1;
  rules: Rule[];
}

/** kintone のレコードのうち、このプラグインが参照する部分 */
export type RecordLike = Record<string, { value?: unknown; error?: string | null } | undefined>;
