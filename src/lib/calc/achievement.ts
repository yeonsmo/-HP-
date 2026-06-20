import type { Achievement } from '../../types/calc';

// 당월 달성 현황 (지침 3.7).
//
// 당월 손익 = R − 당월 변동비 총액 − F  (영업이익 기준)
//   → 시간 기준 토글과 무관하게 항상 "당월" 변동비를 사용한다.
// 달성률 = R ÷ BEP 매출   (BEP 매출 ≤ 0 이면 표시하지 않는다)
// 안전한계율 = (R − BEP 매출) ÷ R   (R 이 0 이면 표시하지 않는다)

export function computeAchievement(
  totalRevenue: number, // R
  currentVariableTotal: number, // 당월 변동비 총액
  fixedCost: number, // F
  bepRevenue: number, // 비교 기준 BEP 매출 (방식 A)
): Achievement {
  const monthlyPnl = totalRevenue - currentVariableTotal - fixedCost;
  const achievementRate = bepRevenue > 0 ? totalRevenue / bepRevenue : undefined;
  const safetyMarginRatio =
    totalRevenue > 0 ? (totalRevenue - bepRevenue) / totalRevenue : undefined;
  return { monthlyPnl, currentVariableTotal, achievementRate, safetyMarginRatio };
}
