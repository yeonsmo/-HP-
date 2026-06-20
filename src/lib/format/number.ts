// 숫자/금액 포맷 및 안전 나눗셈 헬퍼

/**
 * 안전 나눗셈. 분모가 0/NaN/무한대이거나 결과가 유한하지 않으면 fallback 반환.
 * 모든 계산 모듈의 나눗셈은 이 함수를 통해 0 division 을 방어한다.
 */
export function safeDiv(num: number, den: number, fallback = 0): number {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return fallback;
  const r = num / den;
  return Number.isFinite(r) ? r : fallback;
}

/** 입력값을 유한한 숫자로 강제(빈값/NaN → 0) */
export function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const cleaned = v.replace(/,/g, '').trim();
    if (cleaned === '') return 0;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** 원 단위 천단위 콤마 포맷 (정수 표시). 음수도 처리 */
export function formatKRW(v: number): string {
  if (!Number.isFinite(v)) return '0';
  return Math.round(v).toLocaleString('ko-KR');
}

/** 소수 자리 표시 포맷 */
export function formatNumber(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** 비율(0~1)을 백분율 문자열로. undefined면 '-' */
export function formatPercent(v: number | undefined, digits = 1): string {
  if (v === undefined || !Number.isFinite(v)) return '-';
  return `${(v * 100).toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}
