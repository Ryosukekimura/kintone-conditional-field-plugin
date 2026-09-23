import {
  computeRequired,
  computeVisibility,
  conditionFields,
  findMissingRequired,
} from '../common/rules';
import type { PluginConfig, RecordLike } from '../common/types';

export const REQUIRED_MESSAGE = 'この項目は必須です';
export const SUBMIT_ERROR_MESSAGE = '必須項目が入力されていません';

interface RecordEvent {
  record: RecordLike;
  error?: string;
}

/** プラグインが使う kintone API（テストで差し替えられるように最小限に絞る） */
export interface KintoneDesktopApi {
  events: { on(type: string | string[], handler: (event: RecordEvent) => RecordEvent): void };
  app: { record: { setFieldShown(fieldCode: string, isShown: boolean): void } };
}

export function registerPlugin(config: PluginConfig, api: KintoneDesktopApi): void {
  const { rules } = config;
  if (rules.length === 0) return;

  const applyVisibility = (record: RecordLike) => {
    for (const [field, shown] of computeVisibility(rules, record)) {
      api.app.record.setFieldShown(field, shown);
    }
  };

  const showEvents = [
    'app.record.create.show',
    'app.record.edit.show',
    'app.record.detail.show',
  ];
  api.events.on(showEvents, (event) => {
    applyVisibility(event.record);
    return event;
  });

  const changeEvents = conditionFields(rules).flatMap((field) => [
    `app.record.create.change.${field}`,
    `app.record.edit.change.${field}`,
  ]);
  api.events.on(changeEvents, (event) => {
    applyVisibility(event.record);
    // 条件が変わって必須でなくなった項目から、保存時に付けたエラーを消す
    const required = computeRequired(rules, event.record);
    for (const field of new Set(rules.flatMap((r) => r.requireFields))) {
      const target = event.record[field];
      if (target && !required.has(field)) target.error = null;
    }
    return event;
  });

  const submitEvents = [
    'app.record.create.submit',
    'app.record.edit.submit',
    'app.record.index.edit.submit',
  ];
  api.events.on(submitEvents, (event) => {
    const missing = findMissingRequired(rules, event.record);
    for (const field of missing) {
      const target = event.record[field];
      if (target) target.error = REQUIRED_MESSAGE;
    }
    if (missing.length > 0) event.error = SUBMIT_ERROR_MESSAGE;
    return event;
  });
}
