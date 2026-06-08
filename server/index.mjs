// 수압시험 BEP 관리 - 중계 서버
//
// 브라우저(프런트엔드)와 NAS의 SQLite 파일 사이를 중계한다.
// 단일 프로세스가 SQLite 파일을 소유하므로 동시 쓰기 충돌이 없다.
// 외부 네트워크 호출은 전혀 하지 않으며, NAS의 지정 파일에만 읽고 쓴다.
//
// 환경변수(.env):
//   DB_PATH : SQLite 파일 전체 경로 (예: /mnt/nas/bep/bep.db, \\NAS\bep\bep.db)
//   PORT    : 서버 포트 (기본 3000)

import express from 'express';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH;
const PORT = Number(process.env.PORT || 3000);

if (!DB_PATH) {
  console.error('[오류] DB_PATH 환경변수가 없습니다. .env 파일에 DB_PATH 를 지정하세요.');
  console.error('       예) DB_PATH=/mnt/nas/bep/bep.db');
  process.exit(1);
}

// DB 파일이 들어갈 폴더가 없으면 생성 (NAS 마운트 경로 포함)
try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
} catch (e) {
  console.error(`[오류] DB 폴더를 만들 수 없습니다: ${path.dirname(DB_PATH)}`);
  console.error('       NAS 경로가 마운트되어 있고 쓰기 권한이 있는지 확인하세요.');
  console.error(String(e));
  process.exit(1);
}

let db;
try {
  db = new Database(DB_PATH);
} catch (e) {
  console.error(`[오류] SQLite 파일을 열 수 없습니다: ${DB_PATH}`);
  console.error(String(e));
  process.exit(1);
}

// 네트워크 공유(NAS) 안전 설정:
//  - WAL 은 공유 메모리가 필요해 네트워크 드라이브에서 위험하므로 사용하지 않는다.
//  - 데이터 무결성 우선(synchronous=FULL).
db.pragma('journal_mode = DELETE');
db.pragma('synchronous = FULL');

db.exec(`
  CREATE TABLE IF NOT EXISTS months (
    month TEXT PRIMARY KEY,
    data  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS variable_records (
    id    TEXT PRIMARY KEY,
    month TEXT,
    data  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ----- 준비된 쿼리 -----
const q = {
  allMonths: db.prepare('SELECT data FROM months ORDER BY month'),
  putMonth: db.prepare('INSERT INTO months(month, data) VALUES(@month, @data) ON CONFLICT(month) DO UPDATE SET data=@data'),
  delMonth: db.prepare('DELETE FROM months WHERE month=?'),
  allVars: db.prepare('SELECT data FROM variable_records'),
  putVar: db.prepare('INSERT INTO variable_records(id, month, data) VALUES(@id, @month, @data) ON CONFLICT(id) DO UPDATE SET month=@month, data=@data'),
  delVar: db.prepare('DELETE FROM variable_records WHERE id=?'),
  getMeta: db.prepare('SELECT value FROM meta WHERE key=?'),
  putMeta: db.prepare('INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'),
  clearMonths: db.prepare('DELETE FROM months'),
  clearVars: db.prepare('DELETE FROM variable_records'),
};

const restoreTx = db.transaction((months, records) => {
  q.clearMonths.run();
  q.clearVars.run();
  for (const m of months) q.putMonth.run({ month: m.month, data: JSON.stringify(m) });
  for (const r of records) q.putVar.run({ id: r.id, month: r.month, data: JSON.stringify(r) });
});

// ----- 앱 -----
const app = express();
app.use(express.json({ limit: '50mb' }));

// 전체 상태 (앱 시작 시 1회 로드)
app.get('/api/state', (_req, res) => {
  const months = q.allMonths.all().map((row) => JSON.parse(row.data));
  const variableRecords = q.allVars.all().map((row) => JSON.parse(row.data));
  const lastRow = q.getMeta.get('lastSelectedMonth');
  res.json({ months, variableRecords, lastMonth: lastRow ? lastRow.value : null });
});

app.put('/api/month', (req, res) => {
  const m = req.body;
  if (!m || typeof m.month !== 'string') return res.status(400).json({ error: 'invalid month' });
  q.putMonth.run({ month: m.month, data: JSON.stringify(m) });
  res.json({ ok: true });
});

app.delete('/api/month/:month', (req, res) => {
  q.delMonth.run(req.params.month);
  res.json({ ok: true });
});

app.put('/api/variable', (req, res) => {
  const r = req.body;
  if (!r || typeof r.id !== 'string') return res.status(400).json({ error: 'invalid record' });
  q.putVar.run({ id: r.id, month: r.month ?? null, data: JSON.stringify(r) });
  res.json({ ok: true });
});

app.delete('/api/variable/:id', (req, res) => {
  q.delVar.run(req.params.id);
  res.json({ ok: true });
});

app.put('/api/meta/last-month', (req, res) => {
  const month = req.body?.month;
  if (typeof month !== 'string') return res.status(400).json({ error: 'invalid month' });
  q.putMeta.run('lastSelectedMonth', month);
  res.json({ ok: true });
});

// 백업 복원 (전체 교체)
app.post('/api/restore', (req, res) => {
  const { months, variableRecords } = req.body ?? {};
  if (!Array.isArray(months) || !Array.isArray(variableRecords)) {
    return res.status(400).json({ error: 'invalid backup' });
  }
  restoreTx(months, variableRecords);
  res.json({ ok: true });
});

// 빌드된 프런트엔드 정적 서빙
const distDir = path.join(__dirname, '..', 'dist');
app.use(express.static(distDir));
// SPA 폴백 (API 외 경로는 index.html)
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log('수압시험 BEP 관리 서버 시작');
  console.log(`  주소     : http://localhost:${PORT}`);
  console.log(`  DB 파일  : ${DB_PATH}`);
  console.log('  종료     : Ctrl + C');
});
