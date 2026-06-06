import type { Client, Item } from '../../types/domain';
import type { RevenueResult, ClientRevenue, ItemRevenue } from '../../types/calc';
import { safeDiv } from '../format/number';

/** 품목 매출 = 단가 × 누계 EA (부가세 제외 공급가액) */
export function itemRevenue(item: Item): number {
  return item.unitPrice * item.cumulativeEa;
}

/**
 * 매출과 물량 산출.
 * - 거래처 매출 = 그 거래처 품목 매출의 합
 * - 총매출 R = 모든 거래처 매출의 합
 * - 총 EA Q = 모든 품목 누계 EA의 합
 * - 가중평균 단가 P = R ÷ Q (Q=0이면 0)
 */
export function computeRevenue(clients: Client[]): RevenueResult {
  const clientRevenues: ClientRevenue[] = clients.map((c) => {
    const items: ItemRevenue[] = c.items.map((it) => ({
      itemId: it.id,
      name: it.name,
      revenue: itemRevenue(it),
      ea: it.cumulativeEa,
    }));
    const revenue = items.reduce((s, i) => s + i.revenue, 0);
    const ea = items.reduce((s, i) => s + i.ea, 0);
    return { clientId: c.id, name: c.name, revenue, ea, items };
  });

  const totalRevenue = clientRevenues.reduce((s, c) => s + c.revenue, 0);
  const totalEa = clientRevenues.reduce((s, c) => s + c.ea, 0);
  const weightedAvgPrice = safeDiv(totalRevenue, totalEa);

  return { clients: clientRevenues, totalRevenue, totalEa, weightedAvgPrice };
}
