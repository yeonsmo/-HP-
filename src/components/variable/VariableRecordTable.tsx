import { useMemo, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { newId } from '../../lib/id';
import { formatMonthLabel, isValidMonth } from '../../lib/format/month';
import type { VariableNature, VariableRecord } from '../../types/domain';
import { NumberInput } from '../common/NumberInput';

const NATURE_LABEL: Record<VariableNature, string> = {
  common: '공통',
  client: '특정 거래처 귀속',
  itemGroup: '특정 품목군 귀속',
};

/** 변동비 기록 입력 표 (드롭다운 분류). 지침 2.4 */
export function VariableRecordTable() {
  const { selectedMonth, variableRecords, upsertVariableRecord, removeVariableRecord, monthData } =
    useAppData();
  const [showAll, setShowAll] = useState(false);

  // 거래처/품목군 선택지 (당월 기준)
  const clientOptions = monthData.clients.map((c) => ({ id: c.id, name: c.name || '(거래처)' }));
  const itemGroups = useMemo(() => {
    const set = new Set<string>();
    monthData.clients.forEach((c) => c.items.forEach((it) => it.name && set.add(it.name)));
    return [...set];
  }, [monthData]);

  const rows = useMemo(() => {
    const filtered = showAll
      ? variableRecords
      : variableRecords.filter((r) => r.month === selectedMonth);
    return [...filtered].sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
  }, [variableRecords, showAll, selectedMonth]);

  const update = (rec: VariableRecord, patch: Partial<VariableRecord>) => {
    const next = { ...rec, ...patch };
    // 성격이 바뀌면 귀속 대상 초기화
    if (patch.nature && patch.nature !== rec.nature) {
      next.targetClientId = undefined;
      next.targetItemGroup = undefined;
    }
    upsertVariableRecord(next);
  };

  const add = () =>
    upsertVariableRecord({
      id: newId(),
      month: selectedMonth,
      amount: 0,
      account: '',
      nature: 'common',
    });

  return (
    <div className="subsection">
      <div className="row between wrap">
        <h3 className="sub-title">변동비 기록</h3>
        <div className="row gap">
          <label className="small muted no-print">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />{' '}
            모든 월 보기
          </label>
          <button type="button" className="no-print" onClick={add}>
            + 변동비 추가
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="muted small">
          {showAll ? '변동비 기록이 없습니다.' : `${formatMonthLabel(selectedMonth)} 변동비 기록이 없습니다.`}
        </p>
      ) : (
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th>발생 월</th>
                <th>금액</th>
                <th>계정/항목명</th>
                <th>성격 분류</th>
                <th>귀속 대상</th>
                <th className="no-print"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.month !== selectedMonth ? 'other-month' : undefined}>
                  <td>
                    <input
                      type="month"
                      value={r.month}
                      onChange={(e) =>
                        isValidMonth(e.target.value) && update(r, { month: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <NumberInput
                      value={r.amount}
                      suffix="원"
                      onChange={(v) => update(r, { amount: v })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="text-input"
                      value={r.account}
                      placeholder="계정/항목명"
                      onChange={(e) => update(r, { account: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      value={r.nature}
                      onChange={(e) => update(r, { nature: e.target.value as VariableNature })}
                    >
                      {(Object.keys(NATURE_LABEL) as VariableNature[]).map((n) => (
                        <option key={n} value={n}>
                          {NATURE_LABEL[n]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {r.nature === 'client' && (
                      <select
                        value={r.targetClientId ?? ''}
                        onChange={(e) =>
                          update(r, { targetClientId: e.target.value || undefined })
                        }
                      >
                        <option value="">거래처 선택…</option>
                        {clientOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {r.nature === 'itemGroup' && (
                      <select
                        value={r.targetItemGroup ?? ''}
                        onChange={(e) =>
                          update(r, { targetItemGroup: e.target.value || undefined })
                        }
                      >
                        <option value="">품목군 선택…</option>
                        {itemGroups.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    )}
                    {r.nature === 'common' && <span className="muted small">—</span>}
                  </td>
                  <td className="no-print">
                    <button type="button" className="ghost" onClick={() => removeVariableRecord(r.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        귀속 대상 선택지는 당월 거래처·품목 기준입니다. 거래처/품목군 귀속이나 매핑 불가 항목은
        품목군 안분 시 공통으로 처리되어 금액 손실이 없습니다.
      </p>
    </div>
  );
}
