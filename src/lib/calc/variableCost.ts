import type { MonthData, MonthKey, VariableRecord } from '../../types/domain';
import type { Basis, PerEaVariable, ItemGroupVariable } from '../../types/calc';
import { safeDiv } from '../format/number';

// 변동비 산출 모듈 (지침 3.3 / 3.4)
//
// 시간 기준(basis) 토글:
//  - current   : 당월 변동비 / 당월 EA
//  - cumulative : 모든 월 변동비 합 / 모든 월 EA 합 (기본값, 전체 기간 누적)
//
// 품목군(group) 키는 품목명(Item.name)이다. 서로 다른 거래처의 동명 품목은 같은 품목군으로 합산된다.
//
// 방식 A 와 방식 B 의 BEP 가 데이터 구성에 따라 일치/괴리하는 성질은 시간 기준 상호작용에서 비롯된다.
//  - 품목군별 EA당 변동비(v_g)는 basis 기간의 변동비/EA 로 산출한다.
//  - 방식 A 의 가중평균 변동비 v 는 v_g 를 "당월" 품목군 EA 로 가중한다.
//  - 구성이 매월 균일하면 v = 당월변동비/당월Q 가 되어 방식 B 와 일치하고,
//    구성이 치우치거나 월별로 달라지면 두 값이 벌어진다.

/** 당월 변동비 총액 */
export function currentMonthVariableTotal(records: VariableRecord[], month: MonthKey): number {
  return records.filter((r) => r.month === month).reduce((s, r) => s + r.amount, 0);
}

/** 전체 기간 변동비 총액 */
export function cumulativeVariableTotal(records: VariableRecord[]): number {
  return records.reduce((s, r) => s + r.amount, 0);
}

/** 한 월 스냅샷의 총 EA */
export function monthTotalEa(md: MonthData): number {
  return md.clients.reduce((cs, c) => cs + c.items.reduce((is, it) => is + it.cumulativeEa, 0), 0);
}

/** 전체 기간 총 EA (모든 월 합) */
export function cumulativeTotalEa(allMonths: MonthData[]): number {
  return allMonths.reduce((s, md) => s + monthTotalEa(md), 0);
}

/** 한 월 스냅샷의 품목군(품목명)별 EA 맵 */
export function monthGroupEa(md: MonthData): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of md.clients) {
    for (const it of c.items) {
      m.set(it.name, (m.get(it.name) ?? 0) + it.cumulativeEa);
    }
  }
  return m;
}

/** 전체 기간 품목군별 EA 맵 (모든 월 합) */
function cumulativeGroupEa(allMonths: MonthData[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const md of allMonths) {
    for (const [g, ea] of monthGroupEa(md)) {
      m.set(g, (m.get(g) ?? 0) + ea);
    }
  }
  return m;
}

/**
 * EA당 변동비 (지침 3.3). 전체 평균 기준값.
 * 토글 기준에 따라 분자(변동비 총액)와 분모(총 EA)를 선택한다.
 */
export function computePerEaVariable(
  records: VariableRecord[],
  current: MonthData,
  allMonths: MonthData[],
  basis: Basis,
): PerEaVariable {
  if (basis === 'current') {
    const variableTotal = currentMonthVariableTotal(records, current.month);
    const totalEa = monthTotalEa(current);
    return { basis, variableTotal, totalEa, perEa: safeDiv(variableTotal, totalEa) };
  }
  const variableTotal = cumulativeVariableTotal(records);
  const totalEa = cumulativeTotalEa(allMonths);
  return { basis, variableTotal, totalEa, perEa: safeDiv(variableTotal, totalEa) };
}

/**
 * 품목군별 변동비 (지침 3.4).
 * - 특정 품목군 귀속 변동비: 해당 품목군에 직접 귀속.
 * - 특정 거래처 귀속 변동비: 그 변동비가 발생한 월 스냅샷의 해당 거래처 품목들에 EA 비중으로 배분.
 * - 공통 변동비: basis 기간 품목군 EA 비중으로 안분.
 * 매핑 불가(현재/해당월에 없는 품목군·거래처)인 귀속비는 손실을 막기 위해 공통으로 처리한다.
 *
 * @param records      전역 변동비 기록
 * @param current      당월 스냅샷 (품목군 EA 가중 및 표시 EA 기준)
 * @param allMonths    모든 월 스냅샷
 * @param basis        시간 기준
 */
export function computeItemGroupVariables(
  records: VariableRecord[],
  current: MonthData,
  allMonths: MonthData[],
  basis: Basis,
): ItemGroupVariable[] {
  const monthMap = new Map<MonthKey, MonthData>(allMonths.map((m) => [m.month, m]));

  // basis 기간의 품목군 EA (v_g 산출 분모)
  const basisGroupEa = basis === 'current' ? monthGroupEa(current) : cumulativeGroupEa(allMonths);
  const basisQ = [...basisGroupEa.values()].reduce((s, v) => s + v, 0);

  // 당월 품목군 EA (방식 A 가중치 및 표시용)
  const currentGroupEa = monthGroupEa(current);

  // basis 기간 변동비 기록
  const basisRecords =
    basis === 'current' ? records.filter((r) => r.month === current.month) : records;

  const attributed = new Map<string, number>(); // 품목군 직접/배분 귀속
  let commonPool = 0;

  const addAttr = (group: string, amount: number) => {
    if (basisGroupEa.has(group) && (basisGroupEa.get(group) ?? 0) > 0) {
      attributed.set(group, (attributed.get(group) ?? 0) + amount);
    } else {
      commonPool += amount; // 매핑 불가 → 공통 처리 (손실 방지)
    }
  };

  for (const r of basisRecords) {
    if (r.nature === 'itemGroup') {
      addAttr(r.targetItemGroup ?? '', r.amount);
    } else if (r.nature === 'client') {
      // 변동비 발생 월 스냅샷에서 해당 거래처 품목들에 EA 비중 배분
      const snapshot = monthMap.get(r.month);
      const client = snapshot?.clients.find((c) => c.id === r.targetClientId);
      const clientEa = client ? client.items.reduce((s, it) => s + it.cumulativeEa, 0) : 0;
      if (client && clientEa > 0) {
        for (const it of client.items) {
          const share = safeDiv(it.cumulativeEa, clientEa);
          addAttr(it.name, r.amount * share);
        }
      } else {
        commonPool += r.amount; // 거래처/EA 없음 → 공통 처리
      }
    } else {
      commonPool += r.amount; // 공통
    }
  }

  // 공통 변동비를 basis 품목군 EA 비중으로 안분
  const result: ItemGroupVariable[] = [];
  for (const [group, ea] of basisGroupEa) {
    const allocatedCommon = commonPool * safeDiv(ea, basisQ);
    const attr = attributed.get(group) ?? 0;
    const perEa = safeDiv(attr + allocatedCommon, ea);
    result.push({
      group,
      ea: currentGroupEa.get(group) ?? 0, // 표시/가중은 당월 EA
      attributed: attr,
      allocatedCommon,
      perEa,
    });
  }

  // 당월에는 있으나 basis 기간엔 없는 품목군도 표시 (perEa 0)
  for (const [group, ea] of currentGroupEa) {
    if (!basisGroupEa.has(group)) {
      result.push({ group, ea, attributed: 0, allocatedCommon: 0, perEa: 0 });
    }
  }

  return result;
}
