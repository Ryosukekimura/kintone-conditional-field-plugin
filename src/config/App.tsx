import { useEffect, useState } from 'react';
import { serializeConfig, validateConfig } from '../common/config';
import type { PluginConfig, Rule } from '../common/types';
import type { FieldInfo } from './fields';
import { RuleCard } from './RuleCard';

interface Props {
  initialConfig: PluginConfig;
  loadFields: () => Promise<FieldInfo[]>;
  save: (config: Record<string, string>) => void;
  cancel: () => void;
}

function newRule(): Rule {
  return {
    id: crypto.randomUUID(),
    conditionField: '',
    operator: 'equals',
    value: '',
    showFields: [],
    requireFields: [],
  };
}

export function App({ initialConfig, loadFields, save, cancel }: Props) {
  const [fields, setFields] = useState<FieldInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>(initialConfig.rules);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    loadFields()
      .then(setFields)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, [loadFields]);

  if (loadError) return <p className="message message--error">項目の取得に失敗しました: {loadError}</p>;
  if (!fields) return <p className="message">読み込み中…</p>;

  const updateRule = (index: number, rule: Rule) =>
    setRules(rules.map((r, i) => (i === index ? rule : r)));
  const removeRule = (index: number) => setRules(rules.filter((_, i) => i !== index));

  const handleSave = () => {
    const config: PluginConfig = { version: 1, rules };
    const found = validateConfig(config, new Set(fields.map((f) => f.code)));
    setErrors(found);
    if (found.length === 0) save(serializeConfig(config));
  };

  return (
    <div className="app">
      <p className="app__lead">
        ある項目の値に応じて、ほかの項目の表示・非表示や必須を切り替えます。
        同じ項目を複数のルールで「表示する項目」に選んだ場合は、どれか1つでも条件を満たせば表示します。
      </p>

      {rules.map((rule, i) => (
        <RuleCard
          key={rule.id}
          index={i}
          rule={rule}
          fields={fields}
          onChange={(r) => updateRule(i, r)}
          onRemove={() => removeRule(i)}
        />
      ))}

      <button type="button" className="button" onClick={() => setRules([...rules, newRule()])}>
        ＋ ルールを追加
      </button>

      {errors.length > 0 && (
        <ul className="message message--error" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <footer className="app__footer">
        <button type="button" className="button" onClick={cancel}>
          キャンセル
        </button>
        <button type="button" className="button button--primary" onClick={handleSave}>
          保存
        </button>
      </footer>
    </div>
  );
}
