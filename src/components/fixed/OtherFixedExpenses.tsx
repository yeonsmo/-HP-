import { useAppData } from '../../context/AppDataContext';
import { newId } from '../../lib/id';
import { formatKRW } from '../../lib/format/number';
import type { OtherFixedExpense } from '../../types/domain';
import { NumberInput } from '../common/NumberInput';

/** 기타 고정지출 (월별). 지침 2.3 */
export function OtherFixedExpenses() {
  const { monthData, updateMonthData } = useAppData();
  const items = monthData.otherFixedExpenses;
  const total = items.reduce((s, i) => s + i.amount, 0);

  const update = (id: string, patch: Partial<OtherFixedExpense>) =>
    updateMonthData((prev) => ({
      ...prev,
      otherFixedExpenses: prev.otherFixedExpenses.map((o) =>
        o.id === id ? { ...o, ...patch } : o,
      ),
    }));

  const add = () =>
    updateMonthData((prev) => ({
      ...prev,
      otherFixedExpenses: [...prev.otherFixedExpenses, { id: newId(), name: '', amount: 0 }],
    }));

  const remove = (id: string) =>
    updateMonthData((prev) => ({
      ...prev,
      otherFixedExpenses: prev.otherFixedExpenses.filter((o) => o.id !== id),
    }));

  return (
    <div className="subsection">
      <div className="row between">
        <h3 className="sub-title">기타 고정지출</h3>
        <button type="button" className="no-print" onClick={add}>
          + 항목 추가
        </button>
      </div>
      {items.length === 0 ? (
        <p className="muted small">임대료, 통신비, 차량, 보험, 장비 임차·감가 등을 추가하세요.</p>
      ) : (
        <table className="grid narrow">
          <thead>
            <tr>
              <th>항목명</th>
              <th>월 금액</th>
              <th className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td>
                  <input
                    type="text"
                    className="text-input"
                    value={o.name}
                    placeholder="항목명"
                    onChange={(e) => update(o.id, { name: e.target.value })}
                  />
                </td>
                <td>
                  <NumberInput
                    value={o.amount}
                    suffix="원"
                    onChange={(v) => update(o.id, { amount: v })}
                  />
                </td>
                <td className="no-print">
                  <button type="button" className="ghost" onClick={() => remove(o.id)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            <tr className="total-row">
              <td>합계</td>
              <td>{formatKRW(total)} 원</td>
              <td className="no-print"></td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
