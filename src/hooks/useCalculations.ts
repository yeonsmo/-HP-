import { useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { computeAll } from '../lib/calc';
import type { CalcResult } from '../types/calc';

/** 현재 선택 월/시간기준에 대한 전체 산출 결과 (실시간 메모이즈) */
export function useCalculations(): CalcResult {
  const { monthData, variableRecords, allMonths, basis } = useAppData();
  return useMemo(
    () => computeAll(monthData, variableRecords, allMonths, basis),
    [monthData, variableRecords, allMonths, basis],
  );
}
