import { useAppData } from '../../context/AppDataContext';

/** 변동비 시간 기준 토글 (당월 / 누적 가중). 기본값 누적. 지침 3.3 */
export function BasisToggle() {
  const { basis, setBasis } = useAppData();
  return (
    <div className="basis-toggle">
      <span className="field-label">시간 기준</span>
      <div className="seg">
        <button
          type="button"
          className={basis === 'current' ? 'active' : ''}
          onClick={() => setBasis('current')}
        >
          당월
        </button>
        <button
          type="button"
          className={basis === 'cumulative' ? 'active' : ''}
          onClick={() => setBasis('cumulative')}
        >
          누적 가중(전체 기간)
        </button>
      </div>
    </div>
  );
}
