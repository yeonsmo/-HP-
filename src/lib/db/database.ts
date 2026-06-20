import type { MonthData, MonthKey, VariableRecord } from '../../types/domain';

// 서버 API 클라이언트.
// 데이터는 서버를 거쳐 NAS의 SQLite 파일에 저장된다(브라우저에 보관하지 않음).
// 외부 네트워크가 아니라 동일 출처의 중계 서버(/api)만 호출한다.

export interface AppState {
  months: MonthData[];
  variableRecords: VariableRecord[];
  lastMonth: MonthKey | null;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`서버 요청 실패 (${res.status}): ${path}`);
  }
  return (await res.json()) as T;
}

/** 앱 시작 시 전체 상태를 1회 로드 */
export async function getState(): Promise<AppState> {
  return api<AppState>('/state');
}

// ----- months -----

export async function putMonth(data: MonthData): Promise<void> {
  await api('/month', { method: 'PUT', body: JSON.stringify(data) });
}

/** 명시적 월 삭제 (사용자 확인 후에만 호출) */
export async function deleteMonth(month: MonthKey): Promise<void> {
  await api(`/month/${encodeURIComponent(month)}`, { method: 'DELETE' });
}

// ----- variableRecords -----

export async function putVariableRecord(rec: VariableRecord): Promise<void> {
  await api('/variable', { method: 'PUT', body: JSON.stringify(rec) });
}

export async function deleteVariableRecord(id: string): Promise<void> {
  await api(`/variable/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ----- meta -----

export async function setLastMonth(month: MonthKey): Promise<void> {
  await api('/meta/last-month', { method: 'PUT', body: JSON.stringify({ month }) });
}

// ----- 백업 복원용 일괄 교체 -----

export async function replaceAll(
  months: MonthData[],
  variableRecords: VariableRecord[],
): Promise<void> {
  await api('/restore', {
    method: 'POST',
    body: JSON.stringify({ months, variableRecords }),
  });
}
