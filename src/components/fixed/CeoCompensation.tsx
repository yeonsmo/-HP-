import { useAppData } from '../../context/AppDataContext';
import { ceoInsuranceReference } from '../../lib/calc';
import { formatKRW } from '../../lib/format/number';
import { NumberInput } from '../common/NumberInput';

/** 대표이사 보수 (월별, 별도 항목). 지침 2.2 */
export function CeoCompensation() {
  const { monthData, updateMonthData } = useAppData();
  const ceo = monthData.ceo;
  const ref = ceoInsuranceReference(ceo.amount);

  return (
    <div className="subsection">
      <h3 className="sub-title">대표이사 보수</h3>
      <div className="row gap wrap">
        <label className="field">
          <span className="field-label">보수액</span>
          <NumberInput
            value={ceo.amount}
            suffix="원"
            onChange={(v) =>
              updateMonthData((prev) => ({ ...prev, ceo: { ...prev.ceo, amount: v } }))
            }
          />
        </label>
        <label className="field">
          <span className="field-label">4대보험 회사부담분(직접입력)</span>
          <NumberInput
            value={ceo.insuranceCompanyPortion}
            suffix="원"
            onChange={(v) =>
              updateMonthData((prev) => ({
                ...prev,
                ceo: { ...prev.ceo, insuranceCompanyPortion: v },
              }))
            }
          />
        </label>
        <div className="field">
          <span className="field-label">참고: 국민연금+건강(장기요양 포함)</span>
          <div className="ref-box">
            <strong>{formatKRW(ref.total)} 원</strong>
            <span className="hint">
              국민연금 {formatKRW(ref.nationalPension)} · 건강 {formatKRW(ref.health)} · 장기요양{' '}
              {formatKRW(ref.longTermCare)}
            </span>
          </div>
        </div>
      </div>
      <p className="muted small">
        대표이사는 근로자가 아니므로 고용보험·산재보험은 적용하지 않으며 DC 부담금도 적용하지
        않습니다. 참고값은 고정비 계산에 사용되지 않습니다.
      </p>
    </div>
  );
}
