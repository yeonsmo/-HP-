import { useEffect, useState } from 'react';
import { formatNumber, toNumber } from '../../lib/format/number';

interface Props {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  /** 입력 단위(예: 원, %, EA) - 보조 표시 */
  suffix?: string;
  disabled?: boolean;
  /** 소수 허용 자릿수 (기본 0, 정수) */
  decimals?: number;
  ariaLabel?: string;
}

/**
 * 제어형 숫자 입력. 포커스 중에는 원시 텍스트, 블러 시 콤마 포맷으로 표시.
 * 빈값/비정상 입력은 0 으로 강제.
 */
export function NumberInput({
  value,
  onChange,
  placeholder,
  suffix,
  disabled,
  decimals = 0,
  ariaLabel,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>('');

  useEffect(() => {
    if (!focused) setDraft('');
  }, [value, focused]);

  const display = focused
    ? draft
    : value === 0
      ? ''
      : formatNumber(value, decimals);

  return (
    <span className="num-input-wrap">
      <input
        className="num-input"
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={display}
        placeholder={placeholder ?? '0'}
        disabled={disabled}
        onFocus={() => {
          setFocused(true);
          setDraft(value === 0 ? '' : String(value));
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(toNumber(e.target.value));
        }}
        onBlur={() => setFocused(false)}
      />
      {suffix && <span className="num-suffix">{suffix}</span>}
    </span>
  );
}
