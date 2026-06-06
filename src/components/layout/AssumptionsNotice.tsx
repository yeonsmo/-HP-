/** 입력 전제 고지 (지침 6). 화면과 인쇄에 함께 출력된다. */
export function AssumptionsNotice() {
  return (
    <section className="card notice" aria-label="입력 전제">
      <h2 className="card-title">입력 전제</h2>
      <ul className="notice-list">
        <li>모든 단가와 금액은 부가가치세를 제외한 공급가액 기준입니다.</li>
        <li>누계 EA 는 당월 시험 완료분을 기준으로 가산합니다(수금 시점이 아닙니다).</li>
        <li>손익과 목표이익은 영업이익 기준이며 법인세와 영업외 항목은 포함하지 않습니다.</li>
        <li>급여나 고정비가 변동되면 소급하지 않고 변동된 달의 데이터부터 반영합니다.</li>
        <li>손익과 BEP 판정은 항상 월 단위로 고정합니다.</li>
      </ul>
    </section>
  );
}
