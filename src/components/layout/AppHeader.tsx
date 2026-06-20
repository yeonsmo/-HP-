import { useRef, useState } from 'react';
import { useBackup } from '../../hooks/useBackup';
import { usePrint } from '../../hooks/usePrint';

/** 상단 헤더: 제목 + 백업/복원/인쇄 */
export function AppHeader() {
  const { exportJson, importJson } = useBackup();
  const print = usePrint();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string>('');

  return (
    <header className="app-header no-print">
      <div className="app-title">
        <h1>수압시험 BEP 관리</h1>
        <span className="app-subtitle">손익분기점 관리 · 폐쇄망 전용</span>
      </div>
      <div className="row gap">
        <button type="button" onClick={() => void exportJson()}>
          JSON 백업
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          JSON 복원
        </button>
        <button type="button" className="primary" onClick={print}>
          PDF 발행(인쇄)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const res = await importJson(file);
            setMsg(res.message);
            e.target.value = '';
            window.setTimeout(() => setMsg(''), 5000);
          }}
        />
      </div>
      {msg && <div className="header-msg">{msg}</div>}
    </header>
  );
}
