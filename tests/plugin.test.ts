import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PluginConfig, RecordLike } from '../src/common/types';
import {
  type KintoneDesktopApi,
  REQUIRED_MESSAGE,
  SUBMIT_ERROR_MESSAGE,
  registerPlugin,
} from '../src/desktop/plugin';

type Handler = Parameters<KintoneDesktopApi['events']['on']>[1];

/** kintone.events と kintone.app.record の代わりに、登録内容と呼び出しを記録するだけの偽物 */
function createFakeKintone() {
  const handlers = new Map<string, Handler>();
  const api: KintoneDesktopApi = {
    events: {
      on: (types, handler) => {
        for (const type of [types].flat()) handlers.set(type, handler);
      },
    },
    app: { record: { setFieldShown: vi.fn() } },
  };
  const fire = (type: string, record: RecordLike) => {
    const handler = handlers.get(type);
    if (!handler) throw new Error(`${type} のハンドラーが登録されていません`);
    return handler({ record });
  };
  return { api, handlers, fire };
}

const config: PluginConfig = {
  version: 1,
  rules: [
    {
      id: '1',
      conditionField: '種別',
      operator: 'equals',
      value: '法人',
      showFields: ['法人名'],
      requireFields: ['法人名'],
    },
  ],
};

describe('registerPlugin', () => {
  let fake: ReturnType<typeof createFakeKintone>;

  beforeEach(() => {
    fake = createFakeKintone();
    registerPlugin(config, fake.api);
  });

  it('ルールがなければイベントを登録しない', () => {
    const empty = createFakeKintone();
    registerPlugin({ version: 1, rules: [] }, empty.api);
    expect(empty.handlers.size).toBe(0);
  });

  it('画面表示時に表示・非表示を切り替える', () => {
    fake.fire('app.record.detail.show', { 種別: { value: '個人' }, 法人名: { value: '' } });
    expect(fake.api.app.record.setFieldShown).toHaveBeenCalledWith('法人名', false);
  });

  it('条件の項目が変わったら表示を切り替え、不要になったエラーを消す', () => {
    const record: RecordLike = { 種別: { value: '個人' }, 法人名: { value: '', error: REQUIRED_MESSAGE } };
    const result = fake.fire('app.record.edit.change.種別', record);
    expect(fake.api.app.record.setFieldShown).toHaveBeenCalledWith('法人名', false);
    expect(result.record.法人名?.error).toBeNull();
  });

  it('必須項目が未入力なら保存を止める', () => {
    const result = fake.fire('app.record.create.submit', { 種別: { value: '法人' }, 法人名: { value: '' } });
    expect(result.record.法人名?.error).toBe(REQUIRED_MESSAGE);
    expect(result.error).toBe(SUBMIT_ERROR_MESSAGE);
  });

  it('入力済みなら保存を止めない', () => {
    const result = fake.fire('app.record.edit.submit', { 種別: { value: '法人' }, 法人名: { value: '株式会社A' } });
    expect(result.record.法人名?.error).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('一覧画面でのインライン編集でも必須チェックする', () => {
    const result = fake.fire('app.record.index.edit.submit', { 種別: { value: '法人' }, 法人名: { value: '' } });
    expect(result.error).toBe(SUBMIT_ERROR_MESSAGE);
  });
});
