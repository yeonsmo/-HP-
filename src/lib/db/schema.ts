import type { DBSchema } from 'idb';
import type { MonthData, MonthKey, VariableRecord } from '../../types/domain';

export const DB_NAME = 'bep-db';
export const DB_VERSION = 1;
export const APP_VERSION = '1.0.0';

export const STORE_MONTHS = 'months';
export const STORE_VARIABLE = 'variableRecords';
export const STORE_META = 'meta';

export const META_LAST_MONTH = 'lastSelectedMonth';

export interface BepDB extends DBSchema {
  months: {
    key: MonthKey;
    value: MonthData;
  };
  variableRecords: {
    key: string;
    value: VariableRecord;
    indexes: { 'by-month': MonthKey };
  };
  meta: {
    key: string;
    value: unknown;
  };
}
