import { useCalculations } from '../../hooks/useCalculations';
import { formatKRW, formatPercent } from '../../lib/format/number';
import { StatCard } from '../common/StatCard';

/** 당월 달성 현황. 지침 3.7 */
export function AchievementPanel() {
  const { achievement, revenue } = useCalculations();
  const { monthlyPnl, currentVariableTotal, achievementRate, safetyMarginRatio } = achievement;

  return (
    <div className="subsection">
      <h3 className="sub-title">당월 달성 현황</h3>
      <div className="stat-grid">
        <StatCard
          label="당월 손익 (영업이익)"
          value={`${formatKRW(monthlyPnl)} 원`}
          hint="R − 당월 변동비 − F"
          tone={monthlyPnl >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="달성률 (R / BEP매출)"
          value={achievementRate === undefined ? '-' : formatPercent(achievementRate)}
          hint="방식 A 기준"
          tone={achievementRate !== undefined && achievementRate >= 1 ? 'positive' : 'default'}
        />
        <StatCard
          label="안전한계율"
          value={safetyMarginRatio === undefined ? '표시 없음(R=0)' : formatPercent(safetyMarginRatio)}
          hint="(R − BEP매출) / R"
          tone={
            safetyMarginRatio !== undefined && safetyMarginRatio < 0 ? 'warn' : 'default'
          }
        />
        <StatCard
          label="당월 변동비 총액"
          value={`${formatKRW(currentVariableTotal)} 원`}
          hint={`총매출 R ${formatKRW(revenue.totalRevenue)} 원`}
        />
      </div>
    </div>
  );
}
