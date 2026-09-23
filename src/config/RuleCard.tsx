import { VALUELESS_OPERATORS } from '../common/rules';
import type { Operator, Rule } from '../common/types';
import {
  type FieldInfo,
  OPERATOR_LABELS,
  isConditionField,
  isRequireTarget,
  isShowTarget,
  operatorsFor,
} from './fields';

interface Props {
  index: number;
  rule: Rule;
  fields: FieldInfo[];
  onChange: (rule: Rule) => void;
  onRemove: () => void;
}

export function RuleCard({ index, rule, fields, onChange, onRemove }: Props) {
  const conditionField = fields.find((f) => f.code === rule.conditionField);
  const operators = operatorsFor(conditionField);
  const needsValue = !VALUELESS_OPERATORS.includes(rule.operator);

  const changeConditionField = (code: string) => {
    const field = fields.find((f) => f.code === code);
    onChange({
      ...rule,
      conditionField: code,
      operator: operatorsFor(field)[0],
      value: '',
      showFields: rule.showFields.filter((f) => f !== code),
      requireFields: rule.requireFields.filter((f) => f !== code),
    });
  };

  const targetCandidates = fields.filter((f) => f.code !== rule.conditionField);

  return (
    <section className="rule-card">
      <header className="rule-card__header">
        <h2>ルール {index + 1}</h2>
        <button type="button" className="button button--danger" onClick={onRemove}>
          削除
        </button>
      </header>

      <div className="rule-card__condition">
        <span className="rule-card__keyword">もし</span>
        <select
          aria-label="条件の項目"
          value={rule.conditionField}
          onChange={(e) => changeConditionField(e.target.value)}
        >
          <option value="">項目を選択</option>
          {fields.filter(isConditionField).map((f) => (
            <option key={f.code} value={f.code}>
              {f.label === f.code ? f.label : `${f.label}（${f.code}）`}
            </option>
          ))}
        </select>
        <select
          aria-label="比較方法"
          value={rule.operator}
          onChange={(e) => onChange({ ...rule, operator: e.target.value as Operator })}
        >
          {operators.map((op) => (
            <option key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </option>
          ))}
        </select>
        {needsValue &&
          (conditionField && conditionField.options.length > 0 ? (
            <select
              aria-label="条件の値"
              value={rule.value}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
            >
              <option value="">値を選択</option>
              {conditionField.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              aria-label="条件の値"
              type="text"
              value={rule.value}
              placeholder="値"
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
            />
          ))}
        <span className="rule-card__keyword">のとき</span>
      </div>

      <div className="rule-card__targets">
        <FieldChecklist
          title="表示する項目"
          note="条件を満たさないときは非表示になります"
          candidates={targetCandidates.filter(isShowTarget)}
          selected={rule.showFields}
          onChange={(showFields) => onChange({ ...rule, showFields })}
        />
        <FieldChecklist
          title="必須にする項目"
          note="保存時に未入力ならエラーにします"
          candidates={targetCandidates.filter(isRequireTarget)}
          selected={rule.requireFields}
          onChange={(requireFields) => onChange({ ...rule, requireFields })}
        />
      </div>
    </section>
  );
}

interface ChecklistProps {
  title: string;
  note: string;
  candidates: FieldInfo[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function FieldChecklist({ title, note, candidates, selected, onChange }: ChecklistProps) {
  const toggle = (code: string, checked: boolean) =>
    onChange(checked ? [...selected, code] : selected.filter((c) => c !== code));

  return (
    <fieldset className="checklist">
      <legend>
        {title}
        <span className="checklist__count">{selected.length}件</span>
      </legend>
      <p className="checklist__note">{note}</p>
      <div className="checklist__items">
        {candidates.map((f) => (
          <label key={f.code}>
            <input
              type="checkbox"
              checked={selected.includes(f.code)}
              onChange={(e) => toggle(f.code, e.target.checked)}
            />
            {f.label}
            {f.label !== f.code && <span className="checklist__code">{f.code}</span>}
          </label>
        ))}
        {candidates.length === 0 && <p className="checklist__empty">選べる項目がありません</p>}
      </div>
    </fieldset>
  );
}
