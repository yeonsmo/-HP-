import { useAppData } from '../../context/AppDataContext';
import { useCalculations } from '../../hooks/useCalculations';
import {
  cumulativeVariableTotal,
  currentMonthVariableTotal,
} from '../../lib/calc';
import { formatKRW, formatNumber } from '../../lib/format/number';
import { VariableRecordTable } from './VariableRecordTable';
import { BasisToggle } from './BasisToggle';

/** 영역 3: 변동비 */
export function VariableCostSection() {
  const { variableRecords, selectedMonth, basis } = useAppData();
  const { perEaVariable, itemGroups } = useCalculations();

  const currentTotal = currentMonthVariableTotal(variableRecords, selectedMonth);
  const cumTotal = cumulativeVariableTotal(variableRecords);

  return (
    <section className="card">
      <h2 className="card-title">3. 변동비</h2>
      <VariableRecordTable />

      <div className="subsection">
        <div className="row between wrap">
          <h3 className="sub-title">집계 및 EA당 변동비</h3>
          <BasisToggle />
        </div>
        <div className="row gap wrap">
          <span className="chip">당월 변동비 {formatKRW(currentTotal)} 원</span>
          <span className="chip">누적 변동비 {formatKRW(cumTotal)} 원</span>
          <span className="chip strong">
            EA당 변동비({basis === 'current' ? '당월' : '누적'}){' '}
            {formatNumber(perEaVariable.perEa, 1)} 원/EA
          </span>
        </div>

        {itemGroups.length > 0 && (
          <table className="grid narrow">
            <thead>
              <tr>
                <th>품목군</th>
                <th>당월 EA</th>
                <th>귀속 변동비</th>
                <th>안분 공통</th>
                <th>EA당 변동비</th>
              </tr>
            </thead>
            <tbody>
              {itemGroups.map((g) => (
                <tr key={g.group}>
                  <td>{g.group}</td>
                  <td>{formatNumber(g.ea)}</td>
                  <td>{formatKRW(g.attributed)}</td>
                  <td>{formatKRW(g.allocatedCommon)}</td>
                  <td>{formatNumber(g.perEa, 1)} 원</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
