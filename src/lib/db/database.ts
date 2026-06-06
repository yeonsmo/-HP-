import { openDB, type IDBPDatabase } from 'idb';
import type { MonthData, MonthKey, VariableRecord } from '../../types/domain';
import {
  BepDB,
  DB_NAME,
  DB_VERSION,
  META_LAST_MONTH,
  STORE_META,
  STORE_MONTHS,
  STORE_VARIABLE,
} from './schema';

// IndexedDB 접근 래퍼 (idb 로컬 번들). 외부 저장소 미사용.
// 데이터 삭제는 명시적 함수 호출(사용자 액션)로만 발생한다.

let dbPromise: Promise<IDBPDatabase<BepDB>> | null = null;

function getDB(): Promise<IDBPDatabase<BepDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BepDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_MONTHS)) {
          db.createObjectStore(STORE_MONTHS, { keyPath: 'month' });
        }
        if (!db.objectStoreNames.contains(STORE_VARIABLE)) {
          const vs = db.createObjectStore(STORE_VARIABLE, { keyPath: 'id' });
          vs.createIndex('by-month', 'month');
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META);
        }
      },
    });
  }
  return dbPromise;
}

// ----- months -----

export async function getMonth(month: MonthKey): Promise<MonthData | undefined> {
  return (await getDB()).get(STORE_MONTHS, month);
}

export async function getAllMonths(): Promise<MonthData[]> {
  return (await getDB()).getAll(STORE_MONTHS);
}

export async function getAllMonthKeys(): Promise<MonthKey[]> {
  return (await getDB()).getAllKeys(STORE_MONTHS) as Promise<MonthKey[]>;
}

export async function putMonth(data: MonthData): Promise<void> {
  await (await getDB()).put(STORE_MONTHS, data);
}

/** 명시적 월 삭제 (사용자 확인 후에만 호출) */
export async function deleteMonth(month: MonthKey): Promise<void> {
  await (await getDB()).delete(STORE_MONTHS, month);
}

// ----- variableRecords -----

export async function getAllVariableRecords(): Promise<VariableRecord[]> {
  return (await getDB()).getAll(STORE_VARIABLE);
}

export async function putVariableRecord(rec: VariableRecord): Promise<void> {
  await (await getDB()).put(STORE_VARIABLE, rec);
}

export async function deleteVariableRecord(id: string): Promise<void> {
  await (await getDB()).delete(STORE_VARIABLE, id);
}

// ----- meta -----

export async function getLastMonth(): Promise<MonthKey | undefined> {
  return (await getDB()).get(STORE_META, META_LAST_MONTH) as Promise<MonthKey | undefined>;
}

export async function setLastMonth(month: MonthKey): Promise<void> {
  await (await getDB()).put(STORE_META, month, META_LAST_MONTH);
}

// ----- 백업 복원용 일괄 교체 -----

/**
 * 전체 데이터를 교체한다(백업 복원). 기존 스토어를 비우고 새 데이터로 채운다.
 * 사용자가 명시적으로 복원을 확인한 경우에만 호출한다.
 */
export async function replaceAll(
  months: MonthData[],
  variableRecords: VariableRecord[],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([STORE_MONTHS, STORE_VARIABLE], 'readwrite');
  await tx.objectStore(STORE_MONTHS).clear();
  await tx.objectStore(STORE_VARIABLE).clear();
  for (const m of months) await tx.objectStore(STORE_MONTHS).put(m);
  for (const r of variableRecords) await tx.objectStore(STORE_VARIABLE).put(r);
  await tx.done;
}
