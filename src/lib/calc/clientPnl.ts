import type { MonthData, VariableRecord } from '../../types/domain';
import type { ClientPnl, ItemGroupVariable, RevenueResult } from '../../types/calc';
import { safeDiv } from '../format/number';

// 거래처별 손익 (지침 3.6). 당월 기준의 손익 명세이다.
//
// 거래처 변동비 = 거래처 귀속 변동비(당월) + Σ(품목 EA당 변동비 × 각 EA)
// 거래처 안분 고정비 = F × (거래처 매출 ÷ R)
// 거래처 영업손익 = 거래처 매출 − 거래처 변동비 − 거래처 안분 고정비

export function computeClientPnls(
  revenue: RevenueResult,
  itemGroups: ItemGroupVariable[],
  records: VariableRecord[],
  current: MonthData,
  fixedCost: number,
): ClientPnl[] {
  // 품목군 EA당 변동비 조회 맵
  const perEaByGroup = new Map<string, number>(itemGroups.map((g) => [g.group, g.perEa]));

  // 당월 거래처 귀속 변동비 합계 (거래처별)
  const clientAttr = new Map<string, number>();
  for (const r of records) {
    if (r.month === current.month && r.nature === 'client' && r.targetClientId) {
      clientAttr.set(r.targetClientId, (clientAttr.get(r.targetClientId) ?? 0) + r.amount);
    }
  }

  return revenue.clients.map((c) => {
    // 품목별 EA당 변동비 × 각 EA
    const itemsVariable = c.items.reduce(
      (s, it) => s + (perEaByGroup.get(it.name) ?? 0) * it.ea,
      0,
    );
    const variable = (clientAttr.get(c.clientId) ?? 0) + itemsVariable;
    const allocatedFixed = fixedCost * safeDiv(c.revenue, revenue.totalRevenue);
    const operatingPnl = c.revenue - variable - allocatedFixed;
    return {
      clientId: c.clientId,
      name: c.name,
      revenue: c.revenue,
      variable,
      allocatedFixed,
      operatingPnl,
    };
  });
}
