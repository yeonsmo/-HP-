import { useCallback } from 'react';
import { useAppData } from '../context/AppDataContext';
import {
  BackupValidationError,
  exportAll,
  importAll,
  parseBackup,
  serializeBackup,
} from '../lib/db/backup';

/** JSON 백업 내보내기 / 불러오기 */
export function useBackup() {
  const { reloadAll } = useAppData();

  const exportJson = useCallback(async () => {
    const backup = await exportAll();
    const text = serializeBackup(backup);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `bep-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const importJson = useCallback(
    async (file: File): Promise<{ ok: boolean; message: string }> => {
      try {
        const text = await file.text();
        const backup = parseBackup(text);
        const confirmed = window.confirm(
          `복원하면 현재 데이터를 모두 대체합니다.\n` +
            `월 ${backup.months.length}건, 변동비 ${backup.variableRecords.length}건을 불러옵니다.\n` +
            `계속하시겠습니까?`,
        );
        if (!confirmed) return { ok: false, message: '복원이 취소되었습니다.' };
        await importAll(backup);
        await reloadAll();
        return { ok: true, message: '복원이 완료되었습니다.' };
      } catch (e) {
        if (e instanceof BackupValidationError) return { ok: false, message: e.message };
        return { ok: false, message: '복원 중 오류가 발생했습니다.' };
      }
    },
    [reloadAll],
  );

  return { exportJson, importJson };
}
