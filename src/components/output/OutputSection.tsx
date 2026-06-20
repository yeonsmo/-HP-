import { useAppData } from '../../context/AppDataContext';
import { useCalculations } from '../../hooks/useCalculations';
import { BepComparisonTable } from './BepComparisonTable';
import { BepChart } from './BepChart';
import { ClientPnlTable } from './ClientPnlTable';
import { AchievementPanel } from './AchievementPanel';

/** 영역 5: 산출 */
export function OutputSection() {
  const { basis } = useAppData();
  const calc = useCalculations();
  const { bep, revenue, chartA, chartB } = calc;

  const basisLabel = basis === 'current' ? '당월' : '누적 가중';

  return (
    <section className="card output-section">
      <h2 className="card-title">5. 산출 (시간 기준: {basisLabel})</h2>

      <BepComparisonTable />

      <div className="subsection">
        <h3 className="sub-title">BEP 그래프 (매출선 × 총비용선 교차)</h3>
        <div className="chart-grid">
          <BepChart
            title="방식 A — 품목군별 EA당"
            data={chartA}
            price={revenue.weightedAvgPrice}
            bepEa={bep.methodA.bepEa}
            actualEa={revenue.totalEa}
            valid={bep.methodA.valid}
          />
          <BepChart
            title="방식 B — 매출 비례 변동비율"
            data={chartB}
            price={revenue.weightedAvgPrice}
            bepEa={
              revenue.weightedAvgPrice > 0
                ? bep.methodB.bepRevenue / revenue.weightedAvgPrice
                : 0
            }
            actualEa={revenue.totalEa}
            valid={bep.methodB.valid}
            invalidReason="손익분기 도달 불가 (변동비율 ≥ 100%)"
          />
        </div>
      </div>

      <ClientPnlTable />
      <AchievementPanel />
    </section>
  );
}
