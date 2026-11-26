import { useEffect, useState } from 'react';

interface Props {
  label: string;
  value: number;
  onChange(value: number): void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  title?: string;
}

/** Number input that only commits valid values (allows typing "0." etc.). */
export function NumberField({ label, value, onChange, min = 0, max, step = 0.1, suffix, title }: Props) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = (raw: string) => {
    setDraft(raw);
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n) && n >= min && (max === undefined || n <= max)) onChange(n);
  };

  return (
    <label className="field field--number" title={title}>
      <span className="field__label">{label}</span>
      <span className="field__control">
        <input
          type="number"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          step={step}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => setDraft(String(value))}
        />
        {suffix && <span className="field__suffix">{suffix}</span>}
      </span>
    </label>
  );
}
