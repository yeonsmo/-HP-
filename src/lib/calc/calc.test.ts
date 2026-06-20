import { describe, it, expect } from 'vitest';
import { computeAll, computeFixedCost } from './index';
import { safeDiv } from '../format/number';
import { createEmptyMonthData, type MonthData, type VariableRecord } from '../../types/domain';

function month(partial: Partial<MonthData> & { month: string }): MonthData {
  return { ...createEmptyMonthData(partial.month), ...partial };
}

describe('safeDiv', () => {
  it('0 분모를 fallback 으로 방어한다', () => {
    expect(safeDiv(10, 0)).toBe(0);
    expect(safeDiv(10, 0, -1)).toBe(-1);
    expect(safeDiv(Infinity, 2)).toBe(0);
    expect(safeDiv(10, 2)).toBe(5);
  });
});

describe('computeFixedCost', () => {
  it('F = 직원(세전+4대보험+DC) + 대표(보수+4대보험) + 기타', () => {
    const md = month({
      month: '2026-06',
      employees: [
        {
          id: 'e1',
          preTaxSalary: 3_000_000,
          postTaxSalary: 2_600_000,
          insuranceCompanyTotal: 300_000,
          dcEnrollment: 'enrolled',
          dcContribution: 216_667,
        },
      ],
      ceo: { amount: 5_000_000, insuranceCompanyPortion: 400_000 },
      otherFixedExpenses: [{ id: 'o1', name: '임대료', amount: 1_000_000 }],
    });
    const f = computeFixedCost(md);
    expect(f.employeeTotal).toBe(3_516_667);
    expect(f.ceoTotal).toBe(5_400_000);
    expect(f.otherTotal).toBe(1_000_000);
    expect(f.fixedCost).toBe(9_916_667);
  });
});

describe('매출/물량', () => {
  it('R, Q, P 를 정확히 산출한다', () => {
    const md = month({
      month: '2026-06',
      otherFixedExpenses: [{ id: 'o', name: 'f', amount: 4000 }],
      clients: [
        {
          id: 'c1',
          name: 'A',
          items: [
            { id: 'i1', name: 'S', unitPrice: 100, cumulativeEa: 100 },
            { id: 'i2', name: 'L', unitPrice: 300, cumulativeEa: 100 },
          ],
        },
      ],
    });
    const r = computeAll(md, [], [md], 'current');
    expect(r.revenue.totalRevenue).toBe(40_000);
    expect(r.revenue.totalEa).toBe(200);
    expect(r.revenue.weightedAvgPrice).toBe(200);
  });
});

describe('BEP 방식 A / B', () => {
  it('단일 월·당월 기준에서는 두 방식 BEP 가 일치한다', () => {
    const md = month({
      month: '2026-06',
      otherFixedExpenses: [{ id: 'o', name: 'f', amount: 4000 }],
      clients: [
        {
          id: 'c1',
          name: 'A',
          items: [
            { id: 'i1', name: 'S', unitPrice: 100, cumulativeEa: 100 },
            { id: 'i2', name: 'L', unitPrice: 300, cumulativeEa: 100 },
          ],
        },
      ],
    });
    const records: VariableRecord[] = [
      { id: 'v1', month: '2026-06', amount: 8000, account: '공통', nature: 'common' },
    ];
    const r = computeAll(md, records, [md], 'current');
    expect(r.bep.methodA.valid).toBe(true);
    expect(r.bep.methodB.valid).toBe(true);
    expect(r.bep.methodA.bepRevenue).toBeCloseTo(5000, 6);
    expect(r.bep.methodB.bepRevenue).toBeCloseTo(5000, 6);
    expect(r.bep.methodA.bepRevenue).toBeCloseTo(r.bep.methodB.bepRevenue, 6);
  });

  it('누적·구성이 치우치면 두 방식 BEP 가 벌어진다', () => {
    const m1 = month({
      month: '2026-05',
      clients: [
        {
          id: 'c1',
          name: 'A',
          items: [
            { id: 'i1', name: 'S', unitPrice: 100, cumulativeEa: 100 },
            { id: 'i2', name: 'L', unitPrice: 100, cumulativeEa: 100 },
          ],
        },
      ],
    });
    const m2 = month({
      month: '2026-06',
      otherFixedExpenses: [{ id: 'o', name: 'f', amount: 4000 }],
      clients: [
        {
          id: 'c1',
          name: 'A',
          items: [
            { id: 'i1', name: 'S', unitPrice: 100, cumulativeEa: 0 },
            { id: 'i2', name: 'L', unitPrice: 100, cumulativeEa: 200 },
          ],
        },
      ],
    });
    const records: VariableRecord[] = [
      { id: 'v1', month: '2026-05', amount: 5000, account: 'S귀속', nature: 'itemGroup', targetItemGroup: 'S' },
      { id: 'v2', month: '2026-05', amount: 1000, account: 'L귀속', nature: 'itemGroup', targetItemGroup: 'L' },
    ];
    const r = computeAll(m2, records, [m1, m2], 'cumulative');
    expect(r.bep.methodA.valid).toBe(true);
    expect(r.bep.methodB.valid).toBe(true);
    // 방식 A ≈ 4138, 방식 B ≈ 4706 → 분명히 벌어진다
    expect(Math.abs(r.bep.methodA.bepRevenue - r.bep.methodB.bepRevenue)).toBeGreaterThan(100);
    expect(r.bep.methodB.variableRatio).toBeCloseTo(0.15, 6);
  });

  it('변동비가 매출을 초과하면 BEP 산출 불가(valid=false)', () => {
    const md = month({
      month: '2026-06',
      otherFixedExpenses: [{ id: 'o', name: 'f', amount: 1000 }],
      clients: [
        { id: 'c1', name: 'A', items: [{ id: 'i1', name: 'S', unitPrice: 100, cumulativeEa: 100 }] },
      ],
    });
    const records: VariableRecord[] = [
      { id: 'v1', month: '2026-06', amount: 15000, account: '공통', nature: 'common' },
    ];
    const r = computeAll(md, records, [md], 'current');
    expect(r.bep.methodA.valid).toBe(false);
    expect(r.bep.methodB.valid).toBe(false);
    expect(r.bep.methodA.bepRevenue).toBe(0);
  });
});

describe('당월 달성 현황', () => {
  it('R=0 이면 안전한계율을 표시하지 않는다', () => {
    const md = month({ month: '2026-06' });
    const r = computeAll(md, [], [md], 'current');
    expect(r.revenue.totalRevenue).toBe(0);
    expect(r.achievement.safetyMarginRatio).toBeUndefined();
    expect(r.achievement.achievementRate).toBeUndefined();
  });

  it('당월 손익 = R − 당월 변동비 − F (토글 무관, 항상 당월)', () => {
    const md = month({
      month: '2026-06',
      otherFixedExpenses: [{ id: 'o', name: 'f', amount: 4000 }],
      clients: [
        { id: 'c1', name: 'A', items: [{ id: 'i1', name: 'S', unitPrice: 100, cumulativeEa: 100 }] },
      ],
    });
    const records: VariableRecord[] = [
      { id: 'v1', month: '2026-06', amount: 2000, account: '공통', nature: 'common' },
      { id: 'v2', month: '2026-05', amount: 9999, account: '과거', nature: 'common' },
    ];
    const cumulative = computeAll(md, records, [md], 'cumulative');
    // 과거 월 변동비(9999)는 당월 손익에 섞이지 않는다
    expect(cumulative.achievement.monthlyPnl).toBe(10_000 - 2000 - 4000);
  });
});
