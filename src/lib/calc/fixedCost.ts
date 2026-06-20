import type { Employee, MonthData } from '../../types/domain';
import type { FixedCostBreakdown } from '../../types/calc';

/**
 * DC 부담금 자동 산출값 (가입자: 세후급여 ÷ 12, 미가입자: 0).
 * 화면에서 편집 필드의 기본값으로 사용한다. 정수 원으로 내림하지 않고
 * 표시는 화면에서 처리한다(여기서는 원시값 반환).
 */
export function autoDcContribution(emp: Pick<Employee, 'dcEnrollment' | 'postTaxSalary'>): number {
  return emp.dcEnrollment === 'enrolled' ? emp.postTaxSalary / 12 : 0;
}

/**
 * 직원 1인 고정비 = 세전급여 + 직접입력 4대보험 회사부담분 + DC 부담금(필드값).
 * DC 부담금은 사용자가 수정 가능한 필드 값을 그대로 사용한다(직접 입력 우선 원칙).
 */
export function employeeFixed(emp: Employee): number {
  return emp.preTaxSalary + emp.insuranceCompanyTotal + emp.dcContribution;
}

export function employeeFixedTotal(employees: Employee[]): number {
  return employees.reduce((sum, e) => sum + employeeFixed(e), 0);
}

/**
 * 월 고정비 합계 F.
 * F = Σ직원(세전급여 + 4대보험 + DC) + (대표보수 + 대표 4대보험) + Σ기타고정지출
 */
export function computeFixedCost(month: MonthData): FixedCostBreakdown {
  const employeeTotal = employeeFixedTotal(month.employees);
  const ceoTotal = month.ceo.amount + month.ceo.insuranceCompanyPortion;
  const otherTotal = month.otherFixedExpenses.reduce((sum, o) => sum + o.amount, 0);
  return {
    employeeTotal,
    ceoTotal,
    otherTotal,
    fixedCost: employeeTotal + ceoTotal + otherTotal,
  };
}
