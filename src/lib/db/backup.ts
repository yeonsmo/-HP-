import type { BackupFile } from '../../types/db';
import type { MonthData, VariableRecord } from '../../types/domain';
import { isValidMonth } from '../format/month';
import { APP_VERSION, DB_VERSION } from './schema';
import { getState, replaceAll } from './database';

// JSON 백업/복원. 외부 저장소를 사용하지 않고 파일로 내보내고 불러온다.

/** 전체 데이터를 백업 객체로 직렬화 */
export async function exportAll(): Promise<BackupFile> {
  const state = await getState();
  return {
    schemaVersion: DB_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    months: state.months,
    variableRecords: state.variableRecords,
  };
}

/** 백업 객체를 JSON 문자열로 */
export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export class BackupValidationError extends Error {}

/**
 * JSON 텍스트를 검증하여 BackupFile 로 파싱한다. 구조/월키 검증 실패 시 예외.
 * 검증을 통과한 데이터만 복원에 사용한다(무단 병합/삭제 방지).
 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupValidationError('JSON 형식이 올바르지 않습니다.');
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new BackupValidationError('백업 파일 구조가 올바르지 않습니다.');
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.months) || !Array.isArray(obj.variableRecords)) {
    throw new BackupValidationError('months / variableRecords 배열이 없습니다.');
  }

  const months = obj.months as MonthData[];
  for (const m of months) {
    if (!m || typeof m !== 'object' || !isValidMonth((m as MonthData).month)) {
      throw new BackupValidationError('월(YYYY-MM) 키가 올바르지 않은 항목이 있습니다.');
    }
  }

  const variableRecords = obj.variableRecords as VariableRecord[];
  for (const r of variableRecords) {
    if (!r || typeof r !== 'object' || typeof (r as VariableRecord).id !== 'string') {
      throw new BackupValidationError('변동비 기록 형식이 올바르지 않습니다.');
    }
    if (!isValidMonth((r as VariableRecord).month)) {
      throw new BackupValidationError('변동비 기록의 월(YYYY-MM)이 올바르지 않습니다.');
    }
  }

  return {
    schemaVersion: typeof obj.schemaVersion === 'number' ? obj.schemaVersion : DB_VERSION,
    appVersion: typeof obj.appVersion === 'string' ? obj.appVersion : 'unknown',
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    months,
    variableRecords,
  };
}

/** 검증된 백업으로 전체 데이터 교체 (복원) */
export async function importAll(backup: BackupFile): Promise<void> {
  await replaceAll(backup.months, backup.variableRecords);
}
