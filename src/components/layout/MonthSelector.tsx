import { useAppData } from '../../context/AppDataContext';
import { isValidMonth, formatMonthLabel } from '../../lib/format/month';
import { NumberInput } from '../common/NumberInput';

/** 영역 1: 대상 월 선택 + 산재 업종 요율 입력 */
export function MonthSelector() {
  const { selectedMonth, setSelectedMonth, monthData, updateMonthData, allMonths } = useAppData();

  const savedMonths = allMonths.map((m) => m.month).sort();

  return (
    <section className="card" aria-label="대상 월 선택">
      <div className="row gap wrap">
        <label className="field">
          <span className="field-label">대상 월</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              if (isValidMonth(e.target.value)) setSelectedMonth(e.target.value);
            }}
          />
        </label>

        {savedMonths.length > 0 && (
          <label className="field">
            <span className="field-label">저장된 월 이동</span>
            <select
              value={savedMonths.includes(selectedMonth) ? selectedMonth : ''}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
            >
              <option value="">선택…</option>
              {savedMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          <span className="field-label">산재보험 업종 요율</span>
          <NumberInput
            value={monthData.industryAccidentRate}
            decimals={3}
            suffix="%"
            ariaLabel="산재보험 업종 요율"
            onChange={(v) =>
              updateMonthData((prev) => ({ ...prev, industryAccidentRate: v }))
            }
          />
        </label>
      </div>
      <p className="muted small">
        현재 대상: <strong>{formatMonthLabel(selectedMonth)}</strong> · 산재 업종요율은 4대보험
        참고값 산출에만 사용됩니다.
      </p>
    </section>
  );
}
