import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Basis } from '../types/calc';
import {
  createEmptyMonthData,
  type MonthData,
  type MonthKey,
  type VariableRecord,
} from '../types/domain';
import { currentMonthKey } from '../lib/format/month';
import {
  deleteVariableRecord as dbDeleteVar,
  getState,
  putMonth,
  putVariableRecord as dbPutVar,
  setLastMonth,
} from '../lib/db/database';

interface AppDataValue {
  ready: boolean;
  loadError: string | null;
  /** 마지막 저장(쓰기) 실패 메시지. null 이면 정상. */
  saveError: string | null;
  selectedMonth: MonthKey;
  basis: Basis;
  monthData: MonthData;
  allMonths: MonthData[];
  variableRecords: VariableRecord[];
  setSelectedMonth: (m: MonthKey) => void;
  setBasis: (b: Basis) => void;
  /** 당월 데이터 갱신 (디바운스 영속화) */
  updateMonthData: (updater: (prev: MonthData) => MonthData) => void;
  /** 변동비 기록 추가/수정 (즉시 영속화) */
  upsertVariableRecord: (rec: VariableRecord) => void;
  removeVariableRecord: (id: string) => void;
  /** 백업 복원 후 전체 상태 재적재 */
  reloadAll: () => Promise<void>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

const SAVE_DEBOUNCE_MS = 400;

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonthState] = useState<MonthKey>(currentMonthKey());

  // 모든 쓰기(저장) 작업을 감싸 실패 시 배너로 알린다. 성공하면 배너를 지운다.
  const tracked = useCallback((p: Promise<unknown>) => {
    p.then(
      () => setSaveError(null),
      (e: unknown) =>
        setSaveError(
          `저장에 실패했습니다. 입력이 보존되지 않았을 수 있습니다. 서버/NAS 연결을 확인하세요. (${
            e instanceof Error ? e.message : String(e)
          })`,
        ),
    );
  }, []);
  const [basis, setBasis] = useState<Basis>('cumulative');
  const [months, setMonths] = useState<Record<MonthKey, MonthData>>({});
  const [variableRecords, setVariableRecords] = useState<VariableRecord[]>([]);

  const pendingSaves = useRef<Map<MonthKey, MonthData>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSaves = useCallback((keepalive = false) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const pending = pendingSaves.current;
    pendingSaves.current = new Map();
    pending.forEach((md) => {
      tracked(putMonth(md, { keepalive }));
    });
  }, [tracked]);

  const scheduleSave = useCallback(
    (md: MonthData) => {
      pendingSaves.current.set(md.month, md);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushSaves, SAVE_DEBOUNCE_MS);
    },
    [flushSaves],
  );

  const loadAll = useCallback(async () => {
    const state = await getState();
    const map: Record<MonthKey, MonthData> = {};
    for (const m of state.months) map[m.month] = m;
    setMonths(map);
    setVariableRecords(state.variableRecords);
    if (state.lastMonth) setSelectedMonthState(state.lastMonth);
  }, []);

  useEffect(() => {
    loadAll()
      .then(() => setLoadError(null))
      .catch(() => setLoadError('서버에 연결할 수 없습니다. 서버(npm run server)가 실행 중인지, NAS 경로가 연결되어 있는지 확인하세요.'))
      .finally(() => setReady(true));
    // 페이지 종료 전 보류 중인 저장 flush (keepalive 로 전송 취소 방지)
    const onBeforeUnload = () => flushSaves(true);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [loadAll, flushSaves]);

  const monthData = useMemo<MonthData>(
    () => months[selectedMonth] ?? createEmptyMonthData(selectedMonth),
    [months, selectedMonth],
  );

  const allMonths = useMemo<MonthData[]>(() => Object.values(months), [months]);

  const setSelectedMonth = useCallback(
    (m: MonthKey) => {
      flushSaves(); // 월 전환 전 보류 저장 flush (stale write 방지)
      setSelectedMonthState(m);
      tracked(setLastMonth(m));
    },
    [flushSaves, tracked],
  );

  const updateMonthData = useCallback(
    (updater: (prev: MonthData) => MonthData) => {
      setMonths((prev) => {
        const current = prev[selectedMonth] ?? createEmptyMonthData(selectedMonth);
        const next = { ...updater(current), updatedAt: new Date().toISOString() };
        scheduleSave(next);
        return { ...prev, [selectedMonth]: next };
      });
    },
    [selectedMonth, scheduleSave],
  );

  const upsertVariableRecord = useCallback((rec: VariableRecord) => {
    setVariableRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === rec.id);
      const next = idx >= 0 ? prev.map((r) => (r.id === rec.id ? rec : r)) : [...prev, rec];
      return next;
    });
    tracked(dbPutVar(rec));
  }, [tracked]);

  const removeVariableRecord = useCallback((id: string) => {
    setVariableRecords((prev) => prev.filter((r) => r.id !== id));
    tracked(dbDeleteVar(id));
  }, [tracked]);

  const reloadAll = useCallback(async () => {
    await loadAll();
  }, [loadAll]);

  const value: AppDataValue = {
    ready,
    loadError,
    saveError,
    selectedMonth,
    basis,
    monthData,
    allMonths,
    variableRecords,
    setSelectedMonth,
    setBasis,
    updateMonthData,
    upsertVariableRecord,
    removeVariableRecord,
    reloadAll,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
