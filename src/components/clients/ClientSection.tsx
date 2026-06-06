import { useAppData } from '../../context/AppDataContext';
import { useCalculations } from '../../hooks/useCalculations';
import { newId } from '../../lib/id';
import { formatKRW, formatNumber, formatPercent, safeDiv } from '../../lib/format/number';
import { ClientCard } from './ClientCard';

/** 영역 4: 거래처·품목 */
export function ClientSection() {
  const { monthData, updateMonthData } = useAppData();
  const { revenue } = useCalculations();

  const addClient = () =>
    updateMonthData((prev) => ({
      ...prev,
      clients: [...prev.clients, { id: newId(), name: '', items: [] }],
    }));

  return (
    <section className="card">
      <div className="row between">
        <h2 className="card-title">4. 거래처·품목</h2>
        <button type="button" className="no-print" onClick={addClient}>
          + 거래처 추가
        </button>
      </div>

      {monthData.clients.length === 0 ? (
        <p className="muted small">거래처를 추가하고 품목별 단가와 누계 EA를 입력하세요.</p>
      ) : (
        monthData.clients.map((c) => <ClientCard key={c.id} client={c} />)
      )}

      <div className="subsection">
        <h3 className="sub-title">매출·물량 비중</h3>
        <div className="row gap wrap">
          <span className="chip strong">총매출 R {formatKRW(revenue.totalRevenue)} 원</span>
          <span className="chip strong">총 EA Q {formatNumber(revenue.totalEa)}</span>
          <span className="chip">가중평균 단가 P {formatNumber(revenue.weightedAvgPrice, 1)} 원</span>
        </div>
        {revenue.clients.length > 0 && (
          <table className="grid narrow">
            <thead>
              <tr>
                <th>거래처</th>
                <th>매출</th>
                <th>매출 비중</th>
                <th>EA</th>
                <th>물량 비중</th>
              </tr>
            </thead>
            <tbody>
              {revenue.clients.map((c) => (
                <tr key={c.clientId}>
                  <td>{c.name || '(거래처)'}</td>
                  <td>{formatKRW(c.revenue)} 원</td>
                  <td>{formatPercent(safeDiv(c.revenue, revenue.totalRevenue))}</td>
                  <td>{formatNumber(c.ea)}</td>
                  <td>{formatPercent(safeDiv(c.ea, revenue.totalEa))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
