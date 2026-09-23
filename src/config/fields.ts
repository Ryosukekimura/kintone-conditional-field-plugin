import type { Operator } from '../common/types';

export interface FieldInfo {
  code: string;
  label: string;
  type: string;
  /** ドロップダウン・ラジオボタンなどの選択肢（表示順） */
  options: string[];
}

/** 条件に使えるフィールド（kintone の change イベントに対応している型） */
const SINGLE_VALUE_TYPES = ['SINGLE_LINE_TEXT', 'NUMBER', 'DROP_DOWN', 'RADIO_BUTTON'];
const MULTI_VALUE_TYPES = ['CHECK_BOX', 'MULTI_SELECT'];

/** 必須チェックに対応するフィールド */
const REQUIRABLE_TYPES = [
  'SINGLE_LINE_TEXT',
  'MULTI_LINE_TEXT',
  'NUMBER',
  'DROP_DOWN',
  'RADIO_BUTTON',
  'CHECK_BOX',
  'MULTI_SELECT',
  'DATE',
  'TIME',
  'DATETIME',
  'LINK',
  'USER_SELECT',
  'ORGANIZATION_SELECT',
  'GROUP_SELECT',
  'FILE',
];

/** 表示の切り替えに対応しない（システム管理の）フィールド */
const SYSTEM_TYPES = [
  'RECORD_NUMBER',
  '__ID__',
  '__REVISION__',
  'CREATOR',
  'CREATED_TIME',
  'MODIFIER',
  'UPDATED_TIME',
  'STATUS',
  'STATUS_ASSIGNEE',
  'CATEGORY',
];

export const OPERATOR_LABELS: Record<Operator, string> = {
  equals: 'が次と等しい',
  notEquals: 'が次と等しくない',
  includes: 'が次を含む',
  notIncludes: 'が次を含まない',
  isEmpty: 'が空',
  isNotEmpty: 'が空でない',
};

export function isConditionField(field: FieldInfo): boolean {
  return SINGLE_VALUE_TYPES.includes(field.type) || MULTI_VALUE_TYPES.includes(field.type);
}

export function isShowTarget(field: FieldInfo): boolean {
  return !SYSTEM_TYPES.includes(field.type);
}

export function isRequireTarget(field: FieldInfo): boolean {
  return REQUIRABLE_TYPES.includes(field.type);
}

export function operatorsFor(field: FieldInfo | undefined): Operator[] {
  if (field && MULTI_VALUE_TYPES.includes(field.type)) {
    return ['includes', 'notIncludes', 'isEmpty', 'isNotEmpty'];
  }
  return ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'];
}

interface RawField {
  code: string;
  label: string;
  type: string;
  options?: Record<string, { label: string; index: string }>;
}

/** フォーム設定 API のレスポンスを、画面で使いやすい形に変換する */
export function toFieldInfos(properties: Record<string, RawField>): FieldInfo[] {
  return Object.values(properties)
    .map((f) => ({
      code: f.code,
      label: f.label,
      type: f.type,
      options: Object.values(f.options ?? {})
        .sort((a, b) => Number(a.index) - Number(b.index))
        .map((o) => o.label),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ja'));
}

/** 設定中のアプリのフィールド一覧（未公開の変更も含むようにプレビュー環境の API を使う） */
export async function fetchFields(): Promise<FieldInfo[]> {
  const res = await kintone.api(kintone.api.url('/k/v1/preview/app/form/fields', true), 'GET', {
    app: kintone.app.getId(),
  });
  return toFieldInfos(res.properties);
}
