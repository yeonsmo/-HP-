import type { BepChartPoint } from '../../types/calc';

// BEP 그래프 데이터 (지침 4 / 5).
// x축 = EA(물량), 매출선 = P × ea, 총비용선 = F + vRate × ea.
// 두 선의 교차점이 BEP 이다.

const SAMPLES = 40;

/**
 * BEP 차트 포인트 생성.
 * @param fixedCost F
 * @param price     P (가중평균 단가)
 * @param vRate     EA당 변동비 환산율 (방식 A: v, 방식 B: P × 변동비율)
 * @param bepEa     BEP EA (x축 범위 산정용)
 * @param actualEa  현재 실적 EA (x축 범위 산정용)
 */
export function buildBepChart(
  fixedCost: number,
  price: number,
  vRate: number,
  bepEa: number,
  actualEa: number,
): BepChartPoint[] {
  const anchors = [bepEa, actualEa].filter((x) => Number.isFinite(x) && x > 0);
  const base = anchors.length > 0 ? Math.max(...anchors) : 100;
  const xMax = base * 1.3;

  const points: BepChartPoint[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const ea = (xMax * i) / SAMPLES;
    points.push({
      ea,
      revenue: price * ea,
      totalCost: fixedCost + vRate * ea,
    });
  }
  return points;
}
