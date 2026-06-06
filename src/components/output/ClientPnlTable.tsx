import { useCalculations } from '../../hooks/useCalculations';
import { formatKRW } from '../../lib/format/number';

/** 거래처별 손익. 지침 3.6 */
export function ClientPnlTable() {
  const { clientPnls } = useCalculations();
  if (clientPnls.length === 0) return null;

  return (
    <div className="subsection">
      <h3 className="sub-title">거래처별 손익 (당월, 영업이익 기준)</h3>
      <table className="grid">
        <thead>
          <tr>
            <th>거래처</th>
            <th>매출</th>
            <th>변동비</th>
            <th>안분 고정비</th>
            <th>영업손익</th>
          </tr>
        </thead>
        <tbody>
          {clientPnls.map((c) => (
            <tr key={c.clientId}>
              <td>{c.name || '(거래처)'}</td>
              <td>{formatKRW(c.revenue)}</td>
              <td>{formatKRW(c.variable)}</td>
              <td>{formatKRW(c.allocatedFixed)}</td>
              <td className={c.operatingPnl >= 0 ? 'pos' : 'neg'}>{formatKRW(c.operatingPnl)} 원</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        안분 고정비는 매출 비중으로 F 를 배분한 값입니다. 변동비는 거래처 귀속분과 품목 EA당
        변동비의 합입니다.
      </p>
    </div>
  );
}
