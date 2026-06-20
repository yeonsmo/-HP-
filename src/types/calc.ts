// 계산 결과 타입

/** 변동비 시간 기준 */
export type Basis = 'current' | 'cumulative';

/** 4대보험 회사부담분 참고값 (표시 전용, 고정비 계산에 사용하지 않음) */
export interface InsuranceReference {
  nationalPension: number; // 국민연금
  health: number; // 건강보험
  longTermCare: number; // 장기요양
  employment: number; // 고용보험 (대표는 0)
  industrialAccident: number; // 산재보험 (대표는 0)
  total: number;
}

/** 고정비 분해 */
export interface FixedCostBreakdown {
  /** Σ(세전급여 + 직접입력 4대보험 + DC부담금) */
  employeeTotal: number;
  /** 대표보수 + 대표 4대보험 */
  ceoTotal: number;
  /** 기타 고정지출 합계 */
  otherTotal: number;
  /** 월 고정비 합계 F */
  fixedCost: number;
}

export interface ItemRevenue {
  itemId: string;
  name: string;
  revenue: number;
  ea: number;
}

export interface ClientRevenue {
  clientId: string;
  name: string;
  revenue: number;
  ea: number;
  items: ItemRevenue[];
}

/** 매출/물량 결과 */
export interface RevenueResult {
  clients: ClientRevenue[];
  /** 총매출 R */
  totalRevenue: number;
  /** 총 EA Q */
  totalEa: number;
  /** 가중평균 단가 P = R/Q (Q=0이면 0) */
  weightedAvgPrice: number;
}

/** 선택 기준의 EA당 변동비 */
export interface PerEaVariable {
  basis: Basis;
  /** 분자로 사용한 변동비 총액 */
  variableTotal: number;
  /** 분모로 사용한 총 EA */
  totalEa: number;
  /** EA당 변동비 */
  perEa: number;
}

/** 품목군별 변동비 */
export interface ItemGroupVariable {
  group: string; // 품목군(품목명) 키
  ea: number;
  attributed: number; // 직접 귀속(품목군 + 거래처 안분)
  allocatedCommon: number; // 공통 안분
  perEa: number; // (attributed + allocatedCommon) / ea
}

/** BEP 두 방식 결과 */
export interface BepResult {
  methodA: {
    v: number; // EA당 가중평균 변동비
    cmRatio: number; // 공헌이익률
    bepRevenue: number;
    bepEa: number;
    valid: boolean; // CM > 0 여부
  };
  methodB: {
    variableRatio: number; // 변동비율
    bepRevenue: number;
    valid: boolean; // 변동비율 < 1 여부
  };
}

/** 거래처별 손익 */
export interface ClientPnl {
  clientId: string;
  name: string;
  revenue: number;
  variable: number;
  allocatedFixed: number;
  operatingPnl: number;
}

/** 당월 달성 현황 */
export interface Achievement {
  /** 당월 손익 = R - 당월 변동비 총액 - F */
  monthlyPnl: number;
  /** 당월 변동비 총액 (참고 표시) */
  currentVariableTotal: number;
  /** 달성률 = R / BEP매출 (BEP매출<=0이면 undefined) */
  achievementRate?: number;
  /** 안전한계율 = (R - BEP매출)/R (R=0이면 undefined) */
  safetyMarginRatio?: number;
}

/** BEP 그래프 데이터 포인트 */
export interface BepChartPoint {
  ea: number;
  revenue: number;
  totalCost: number;
}

/** 통합 계산 결과 */
export interface CalcResult {
  fixed: FixedCostBreakdown;
  revenue: RevenueResult;
  perEaVariable: PerEaVariable;
  itemGroups: ItemGroupVariable[];
  bep: BepResult;
  clientPnls: ClientPnl[];
  achievement: Achievement;
  chartA: BepChartPoint[];
  chartB: BepChartPoint[];
  /** Method B 차트용 EA당 변동비 환산율 (P × 변동비율) */
  chartBVRate: number;
}
