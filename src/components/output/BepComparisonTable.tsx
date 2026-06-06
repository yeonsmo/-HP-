import { useCalculations } from '../../hooks/useCalculations';
import { formatKRW, formatNumber, formatPercent } from '../../lib/format/number';

/** 두 방식 BEP 비교표. 지침 3.5 / 5 */
export function BepComparisonTable() {
  const { bep } = useCalculations();
  const a = bep.methodA;
  const b = bep.methodB;

  return (
    <div className="subsection">
      <h3 className="sub-title">BEP 두 방식 비교</h3>
      <table className="grid compare">
        <thead>
          <tr>
            <th>항목</th>
            <th>방식 A (품목군별 EA당)</th>
            <th>방식 B (매출 비례 변동비율)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>공헌이익률</td>
            <td>{a.valid ? formatPercent(a.cmRatio) : '산출 불가'}</td>
            <td>{b.valid ? formatPercent(1 - b.variableRatio) : '산출 불가'}</td>
          </tr>
          <tr>
            <td>BEP 매출</td>
            <td>{a.valid ? `${formatKRW(a.bepRevenue)} 원` : '산출 불가'}</td>
            <td>{b.valid ? `${formatKRW(b.bepRevenue)} 원` : '산출 불가'}</td>
          </tr>
          <tr>
            <td>BEP EA</td>
            <td>{a.valid ? formatNumber(a.bepEa, 1) : '-'}</td>
            <td className="muted">매출 기준(EA 미산출)</td>
          </tr>
          <tr>
            <td className="muted small">보조 지표</td>
            <td className="muted small">EA당 변동비 v {formatNumber(a.v, 1)} 원</td>
            <td className="muted small">변동비율 {formatPercent(b.variableRatio)}</td>
          </tr>
        </tbody>
      </table>
      {(!a.valid || !b.valid) && (
        <p className="muted small">
          공헌이익률이 0 이하이거나 변동비율이 100% 이상이면 BEP 가 성립하지 않아 산출 불가로
          표시됩니다.
        </p>
      )}
    </div>
  );
}
