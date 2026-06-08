import { AppDataProvider, useAppData } from './context/AppDataContext';
import { AppHeader } from './components/layout/AppHeader';
import { MonthSelector } from './components/layout/MonthSelector';
import { AssumptionsNotice } from './components/layout/AssumptionsNotice';
import { FixedCostSection } from './components/fixed/FixedCostSection';
import { VariableCostSection } from './components/variable/VariableCostSection';
import { ClientSection } from './components/clients/ClientSection';
import { OutputSection } from './components/output/OutputSection';
import { formatMonthLabel } from './lib/format/month';

function PrintTitle() {
  const { selectedMonth } = useAppData();
  return (
    <div className="print-only print-title">
      수압시험 BEP 관리 — {formatMonthLabel(selectedMonth)}
    </div>
  );
}

function AppBody() {
  const { ready, loadError } = useAppData();
  if (!ready) {
    return <div className="loading">데이터를 불러오는 중…</div>;
  }
  return (
    <>
      <AppHeader />
      <PrintTitle />
      {loadError && <div className="load-error no-print">{loadError}</div>}
      <main className="container">
        <MonthSelector />
        <AssumptionsNotice />
        <FixedCostSection />
        <VariableCostSection />
        <ClientSection />
        <OutputSection />
      </main>
      <footer className="app-footer no-print">
        폐쇄망 전용 · 외부 네트워크 통신 없음 · 데이터는 브라우저(IndexedDB)에 저장됩니다.
      </footer>
    </>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <AppBody />
    </AppDataProvider>
  );
}
