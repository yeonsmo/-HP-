import type { MonthData, VariableRecord } from './domain';

/** JSON 백업 파일 봉투 */
export interface BackupFile {
  /** IndexedDB 스키마 버전과 일치 */
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  months: MonthData[];
  variableRecords: VariableRecord[];
}
