import { INSURANCE_RATES_2026 } from '../../constants/rates';
import type { InsuranceReference } from '../../types/calc';

// 4대보험 회사부담분 참고값 산출 (표시 전용).
// 절대 고정비(F) 계산에 사용하지 않는다. 교차 확인 용도로만 화면에 표시한다.

/**
 * 직원 4대보험 회사부담분 참고값 (세전급여 기준).
 * @param preTaxSalary 세전급여(원)
 * @param industryRatePercent 산재 업종요율(%) — 예: 0.7 은 0.7%
 */
export function employeeInsuranceReference(
  preTaxSalary: number,
  industryRatePercent: number,
): InsuranceReference {
  const nationalPension = preTaxSalary * INSURANCE_RATES_2026.nationalPension;
  const health = preTaxSalary * INSURANCE_RATES_2026.health;
  const longTermCare = health * INSURANCE_RATES_2026.longTermCareOfHealth;
  const employment = preTaxSalary * INSURANCE_RATES_2026.employment;
  const industrialAccident = preTaxSalary * (industryRatePercent / 100);
  return {
    nationalPension,
    health,
    longTermCare,
    employment,
    industrialAccident,
    total: nationalPension + health + longTermCare + employment + industrialAccident,
  };
}

/**
 * 대표이사 4대보험 참고값.
 * 국민연금과 건강보험(장기요양 포함)만 합산한다.
 * 고용보험과 산재보험은 적용하지 않는다(대표이사는 근로자가 아님).
 * @param amount 대표 보수액(원)
 */
export function ceoInsuranceReference(amount: number): InsuranceReference {
  const nationalPension = amount * INSURANCE_RATES_2026.nationalPension;
  const health = amount * INSURANCE_RATES_2026.health;
  const longTermCare = health * INSURANCE_RATES_2026.longTermCareOfHealth;
  return {
    nationalPension,
    health,
    longTermCare,
    employment: 0,
    industrialAccident: 0,
    total: nationalPension + health + longTermCare,
  };
}
