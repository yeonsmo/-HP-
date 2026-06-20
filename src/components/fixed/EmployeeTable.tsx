import { useAppData } from '../../context/AppDataContext';
import { autoDcContribution, employeeInsuranceReference } from '../../lib/calc';
import { newId } from '../../lib/id';
import { formatKRW } from '../../lib/format/number';
import type { Employee } from '../../types/domain';
import { NumberInput } from '../common/NumberInput';

/** 직원 인건비 표 (직접 입력 + 참고값 표시). 지침 2.1 */
export function EmployeeTable() {
  const { monthData, updateMonthData } = useAppData();
  const employees = monthData.employees;
  const industryRate = monthData.industryAccidentRate;

  const update = (id: string, patch: Partial<Employee>) =>
    updateMonthData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));

  const add = () =>
    updateMonthData((prev) => ({
      ...prev,
      employees: [
        ...prev.employees,
        {
          id: newId(),
          name: '',
          preTaxSalary: 0,
          postTaxSalary: 0,
          insuranceCompanyTotal: 0,
          dcEnrollment: 'notEnrolled',
          dcContribution: 0,
        },
      ],
    }));

  const remove = (id: string) =>
    updateMonthData((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== id),
    }));

  return (
    <div className="subsection">
      <div className="row between">
        <h3 className="sub-title">직원 인건비</h3>
        <button type="button" className="no-print" onClick={add}>
          + 직원 추가
        </button>
      </div>

      {employees.length === 0 ? (
        <p className="muted small">직원을 추가하세요. 모든 값은 직접 입력합니다.</p>
      ) : (
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th>직원명</th>
                <th>세전급여</th>
                <th>세후급여</th>
                <th>4대보험 회사부담(직접입력)</th>
                <th>DC 가입</th>
                <th>DC 부담금</th>
                <th className="ref-col">참고: 4대보험(세전기준)</th>
                <th className="no-print"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => {
                const ref = employeeInsuranceReference(e.preTaxSalary, industryRate);
                const autoDc = autoDcContribution(e);
                return (
                  <tr key={e.id}>
                    <td>
                      <input
                        type="text"
                        className="text-input"
                        value={e.name ?? ''}
                        placeholder="(선택)"
                        onChange={(ev) => update(e.id, { name: ev.target.value })}
                      />
                    </td>
                    <td>
                      <NumberInput
                        value={e.preTaxSalary}
                        suffix="원"
                        onChange={(v) => update(e.id, { preTaxSalary: v })}
                      />
                    </td>
                    <td>
                      <NumberInput
                        value={e.postTaxSalary}
                        suffix="원"
                        onChange={(v) => {
                          // 세후 변경 시, 가입자이고 DC가 기존 자동값과 같았다면 자동값 갱신
                          const wasAuto =
                            e.dcEnrollment === 'enrolled' &&
                            Math.round(e.dcContribution) === Math.round(autoDcContribution(e));
                          const patch: Partial<Employee> = { postTaxSalary: v };
                          if (wasAuto) {
                            patch.dcContribution = Math.round(v / 12);
                          }
                          update(e.id, patch);
                        }}
                      />
                    </td>
                    <td>
                      <NumberInput
                        value={e.insuranceCompanyTotal}
                        suffix="원"
                        onChange={(v) => update(e.id, { insuranceCompanyTotal: v })}
                      />
                    </td>
                    <td>
                      <select
                        value={e.dcEnrollment}
                        onChange={(ev) => {
                          const dcEnrollment = ev.target.value as Employee['dcEnrollment'];
                          const patch: Partial<Employee> = { dcEnrollment };
                          patch.dcContribution =
                            dcEnrollment === 'enrolled' ? Math.round(e.postTaxSalary / 12) : 0;
                          update(e.id, patch);
                        }}
                      >
                        <option value="enrolled">가입</option>
                        <option value="notEnrolled">미가입</option>
                      </select>
                    </td>
                    <td>
                      <NumberInput
                        value={e.dcContribution}
                        suffix="원"
                        disabled={e.dcEnrollment !== 'enrolled'}
                        onChange={(v) => update(e.id, { dcContribution: v })}
                      />
                      {e.dcEnrollment === 'enrolled' && (
                        <div className="hint">자동값 {formatKRW(autoDc)} (수정 가능)</div>
                      )}
                    </td>
                    <td className="ref-col">
                      <div className="ref-total">{formatKRW(ref.total)} 원</div>
                      <div className="hint">
                        국{formatKRW(ref.nationalPension)} 건{formatKRW(ref.health)} 요
                        {formatKRW(ref.longTermCare)} 고{formatKRW(ref.employment)} 산
                        {formatKRW(ref.industrialAccident)}
                      </div>
                    </td>
                    <td className="no-print">
                      <button type="button" className="ghost" onClick={() => remove(e.id)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        참고 4대보험은 세전급여 기준 교차 확인용이며 고정비 계산에 사용되지 않습니다. 고정비에는
        직접 입력한 4대보험 회사부담분과 DC 부담금 필드 값을 사용합니다.
      </p>
    </div>
  );
}
