// 도메인 데이터 모델
// 모든 데이터는 월(YYYY-MM)을 최상위 키로 관리한다.
// 각 월(MonthData)은 직원/대표/기타고정비/거래처를 자체 보유하는 독립 스냅샷이다.
// 이 구조가 "급여·고정비 변동은 소급하지 않고 변동된 달부터 반영" 원칙을 보장한다.
// 변동비 기록(VariableRecord)만 전역 평면 목록으로 보관한다(누적 가중평균 산출을 위해).

/** "YYYY-MM" 형식의 월 키 */
export type MonthKey = string;

/** 변동비 성격 분류 */
export type VariableNature =
  | 'common' // 공통
  | 'client' // 특정 거래처 귀속
  | 'itemGroup'; // 특정 품목군 귀속

/** DC형 연금 가입 여부 */
export type DcEnrollment = 'enrolled' | 'notEnrolled';

/** 직원 인건비 (월별, 전부 직접 입력) */
export interface Employee {
  id: string;
  name?: string;
  /** 세전급여(원) - 직접 입력 */
  preTaxSalary: number;
  /** 세후급여(원) - 직접 입력, DC 부담금 산정 기준 */
  postTaxSalary: number;
  /** 4대보험 회사부담분 합계(원) - 직접 입력 */
  insuranceCompanyTotal: number;
  /** DC형 연금 가입 여부 */
  dcEnrollment: DcEnrollment;
  /**
   * DC 부담금(원). 가입 시 세후급여÷12 로 자동 채워지나 사용자가 직접 수정할 수 있다.
   * 고정비 계산에는 이 필드 값을 사용한다(직접 입력 우선 원칙).
   */
  dcContribution: number;
}

/** 대표이사 보수 (월별, 별도 항목) */
export interface CeoCompensation {
  /** 보수액(원) - 직접 입력 */
  amount: number;
  /** 4대보험 회사부담분(원) - 직접 입력 */
  insuranceCompanyPortion: number;
}

/** 기타 고정지출 (월별) */
export interface OtherFixedExpense {
  id: string;
  name: string;
  /** 월 금액(원) */
  amount: number;
}

/** 품목 (거래처 하위) */
export interface Item {
  id: string;
  /** 품목명(예: 소구경, 대구경). 품목군 키로도 사용된다. */
  name: string;
  /** EA당 단가(원, 부가가치세 제외 공급가액) */
  unitPrice: number;
  /** 당월 누계 EA(완료 검사 기준) */
  cumulativeEa: number;
}

/** 거래처 */
export interface Client {
  id: string;
  name: string;
  items: Item[];
}

/** 변동비 기록 (발생 단위 누적, 전역 보관) */
export interface VariableRecord {
  id: string;
  /** 발생 월(YYYY-MM) */
  month: MonthKey;
  /** 금액(원) */
  amount: number;
  /** 계정과목 또는 항목명 */
  account: string;
  /** 성격 분류 */
  nature: VariableNature;
  /** 거래처 귀속 시 거래처 id */
  targetClientId?: string;
  /** 품목군 귀속 시 품목군(품목명) 키 */
  targetItemGroup?: string;
}

/** 월별 자기완결 스냅샷 */
export interface MonthData {
  month: MonthKey;
  /** 산재보험 업종 요율(%) - 화면 입력. 참고값 산출에만 사용 */
  industryAccidentRate: number;
  employees: Employee[];
  ceo: CeoCompensation;
  otherFixedExpenses: OtherFixedExpense[];
  clients: Client[];
  /** 최종 수정 시각(ISO) */
  updatedAt: string;
}

/** 빈 월 데이터 생성 (자동 영속화하지 않음) */
export function createEmptyMonthData(month: MonthKey): MonthData {
  return {
    month,
    industryAccidentRate: 0,
    employees: [],
    ceo: { amount: 0, insuranceCompanyPortion: 0 },
    otherFixedExpenses: [],
    clients: [],
    updatedAt: new Date().toISOString(),
  };
}
