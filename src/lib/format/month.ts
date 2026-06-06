import type { MonthKey } from '../../types/domain';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** "YYYY-MM" 형식 유효성 검사 */
export function isValidMonth(m: string): m is MonthKey {
  return MONTH_RE.test(m);
}

/** 현재 월 키 반환 */
export function currentMonthKey(): MonthKey {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${mo}`;
}

/** 월 키를 화면 표기로 (예: 2026-06 → 2026년 6월) */
export function formatMonthLabel(m: MonthKey): string {
  if (!isValidMonth(m)) return m;
  const [y, mo] = m.split('-');
  return `${y}년 ${Number(mo)}월`;
}

/** 월 키 목록을 오름차순 정렬 */
export function sortMonths(months: MonthKey[]): MonthKey[] {
  return [...months].sort();
}
