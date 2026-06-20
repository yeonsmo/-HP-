import { useCalculations } from '../../hooks/useCalculations';
import { formatKRW } from '../../lib/format/number';
import { EmployeeTable } from './EmployeeTable';
import { CeoCompensation } from './CeoCompensation';
import { OtherFixedExpenses } from './OtherFixedExpenses';

/** 영역 2: 고정비 */
export function FixedCostSection() {
  const { fixed } = useCalculations();
  return (
    <section className="card">
      <h2 className="card-title">2. 고정비</h2>
      <EmployeeTable />
      <CeoCompensation />
      <OtherFixedExpenses />

      <div className="fixed-total">
        <div className="row gap wrap">
          <span className="chip">직원 합계 {formatKRW(fixed.employeeTotal)} 원</span>
          <span className="chip">대표 합계 {formatKRW(fixed.ceoTotal)} 원</span>
          <span className="chip">기타 합계 {formatKRW(fixed.otherTotal)} 원</span>
        </div>
        <div className="grand-total">
          월 고정비 합계 F = <strong>{formatKRW(fixed.fixedCost)} 원</strong>
        </div>
      </div>
    </section>
  );
}
