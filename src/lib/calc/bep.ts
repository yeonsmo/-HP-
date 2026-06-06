import type { BepResult, ItemGroupVariable } from '../../types/calc';
import { safeDiv } from '../format/number';

// BEP 두 가지 방식 (지침 3.5). 모든 손익/BEP 는 월 단위 고정비 F 기준이다.

/**
 * 방식 A (품목군별 EA당).
 * v = Σ(품목군별 EA당 변동비 × 당월 품목군 EA) ÷ Q
 * 공헌이익률 = 1 − (v ÷ P)
 * BEP 매출 = F ÷ 공헌이익률
 * BEP EA = BEP 매출 ÷ P
 * 공헌이익률 ≤ 0 이면 BEP 산출 불가(valid=false).
 */
export function computeBepMethodA(
  itemGroups: ItemGroupVariable[],
  totalEa: number, // Q (당월 총 EA)
  weightedAvgPrice: number, // P
  fixedCost: number, // F
): BepResult['methodA'] {
  const weightedVariable = itemGroups.reduce((s, g) => s + g.perEa * g.ea, 0);
  const v = safeDiv(weightedVariable, totalEa);
  const cmRatio = weightedAvgPrice > 0 ? 1 - v / weightedAvgPrice : 0;
  const valid = cmRatio > 0 && weightedAvgPrice > 0;
  const bepRevenue = valid ? safeDiv(fixedCost, cmRatio) : 0;
  const bepEa = valid ? safeDiv(bepRevenue, weightedAvgPrice) : 0;
  return { v, cmRatio, bepRevenue, bepEa, valid };
}

/**
 * 방식 B (매출 비례 변동비율).
 * 변동비율 = 기간 변동비 총액 ÷ 기간 총매출
 * BEP 매출 = F ÷ (1 − 변동비율)
 * 변동비율 ≥ 1 이면 BEP 산출 불가(valid=false).
 */
export function computeBepMethodB(
  periodVariableTotal: number,
  periodRevenue: number,
  fixedCost: number,
): BepResult['methodB'] {
  const variableRatio = safeDiv(periodVariableTotal, periodRevenue);
  const valid = periodRevenue > 0 && variableRatio < 1;
  const bepRevenue = valid ? safeDiv(fixedCost, 1 - variableRatio) : 0;
  return { variableRatio, bepRevenue, valid };
}

export function computeBep(
  itemGroups: ItemGroupVariable[],
  totalEa: number,
  weightedAvgPrice: number,
  fixedCost: number,
  periodVariableTotal: number,
  periodRevenue: number,
): BepResult {
  return {
    methodA: computeBepMethodA(itemGroups, totalEa, weightedAvgPrice, fixedCost),
    methodB: computeBepMethodB(periodVariableTotal, periodRevenue, fixedCost),
  };
}
