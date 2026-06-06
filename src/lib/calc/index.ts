import type { MonthData, VariableRecord } from '../../types/domain';
import type { Basis, CalcResult } from '../../types/calc';
import { safeDiv } from '../format/number';
import { computeFixedCost } from './fixedCost';
import { computeRevenue } from './revenue';
import {
  computePerEaVariable,
  computeItemGroupVariables,
  currentMonthVariableTotal,
  cumulativeVariableTotal,
} from './variableCost';
import { computeBep } from './bep';
import { computeClientPnls } from './clientPnl';
import { computeAchievement } from './achievement';
import { buildBepChart } from './chartData';

export * from './fixedCost';
export * from './insurance';
export * from './revenue';
export * from './variableCost';
export * from './bep';
export * from './clientPnl';
export * from './achievement';
export * from './chartData';

/**
 * 통합 계산 퍼사드. 선택된 월/시간기준에 대한 전체 산출 결과를 반환한다.
 * @param monthData   당월 스냅샷
 * @param allRecords  전역 변동비 기록
 * @param allMonths   모든 월 스냅샷 (누적 산출용)
 * @param basis       시간 기준 토글
 */
export function computeAll(
  monthData: MonthData,
  allRecords: VariableRecord[],
  allMonths: MonthData[],
  basis: Basis,
): CalcResult {
  const fixed = computeFixedCost(monthData);
  const revenue = computeRevenue(monthData.clients);
  const perEaVariable = computePerEaVariable(allRecords, monthData, allMonths, basis);
  const itemGroups = computeItemGroupVariables(allRecords, monthData, allMonths, basis);

  // 방식 B 변동비율 산출용 기간 변동비/매출
  let periodVariableTotal: number;
  let periodRevenue: number;
  if (basis === 'current') {
    periodVariableTotal = currentMonthVariableTotal(allRecords, monthData.month);
    periodRevenue = revenue.totalRevenue;
  } else {
    periodVariableTotal = cumulativeVariableTotal(allRecords);
    periodRevenue = allMonths.reduce((s, md) => s + computeRevenue(md.clients).totalRevenue, 0);
  }

  const bep = computeBep(
    itemGroups,
    revenue.totalEa,
    revenue.weightedAvgPrice,
    fixed.fixedCost,
    periodVariableTotal,
    periodRevenue,
  );

  const clientPnls = computeClientPnls(revenue, itemGroups, allRecords, monthData, fixed.fixedCost);

  // 당월 달성: 항상 당월 변동비 사용, 비교 기준 BEP 매출은 방식 A
  const currentVarTotal = currentMonthVariableTotal(allRecords, monthData.month);
  const achievement = computeAchievement(
    revenue.totalRevenue,
    currentVarTotal,
    fixed.fixedCost,
    bep.methodA.bepRevenue,
  );

  // 차트: 방식 A 는 v, 방식 B 는 P × 변동비율 을 EA당 변동비로 사용
  const chartBVRate = revenue.weightedAvgPrice * bep.methodB.variableRatio;
  const chartA = buildBepChart(
    fixed.fixedCost,
    revenue.weightedAvgPrice,
    bep.methodA.v,
    bep.methodA.bepEa,
    revenue.totalEa,
  );
  const chartB = buildBepChart(
    fixed.fixedCost,
    revenue.weightedAvgPrice,
    chartBVRate,
    safeDiv(bep.methodB.bepRevenue, revenue.weightedAvgPrice),
    revenue.totalEa,
  );

  return {
    fixed,
    revenue,
    perEaVariable,
    itemGroups,
    bep,
    clientPnls,
    achievement,
    chartA,
    chartB,
    chartBVRate,
  };
}
