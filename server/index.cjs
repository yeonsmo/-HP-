// 수압시험 BEP 관리 - 중계 서버 (CommonJS, exe 패키징 호환)
//
// 브라우저(프런트엔드)와 NAS의 SQLite 파일 사이를 중계한다.
// 단일 프로세스가 SQLite 파일을 소유하므로 동시 쓰기 충돌이 없다.
// 외부 네트워크 호출은 전혀 하지 않으며, NAS의 지정 파일에만 읽고 쓴다.
//
// 설정(.env, exe와 같은 폴더):
//   DB_PATH : SQLite 파일 전체 경로 (예: Z:\bep\bep.db, \\NAS\bep\bep.db)
//   PORT    : 서버 포트 (기본 3000)

const express = require('express');
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { exec, execSync } = require('node:child_process');

// pkg 로 만든 exe 로 실행되면 process.pkg 가 설정된다.
const isPackaged = !!process.pkg;
// 설정/정적파일의 기준 폴더: exe 실행 시 exe 옆 폴더, 개발 시 프로젝트 루트.
const baseDir = isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..');

// 콘솔창이 바로 닫히지 않도록(더블클릭 실행 대비) 종료 전 대기.
function holdOpen() {
  if (!isPackaged) return;
  try {
    execSync('pause', { stdio: 'inherit', shell: 'cmd.exe' });
  } catch {
    /* pause 불가 환경이면 무시 */
  }
}

function fatal(lines) {
  for (const l of [].concat(lines)) console.error(l);
  holdOpen();
  process.exit(1);
}

// ----- .env 직접 읽기 (--env-file 플래그 없이도, exe 더블클릭에서도 동작) -----
function loadDotEnv(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return; // .env 없으면 통과 (이미 환경변수로 줬을 수 있음)
  }
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Za-z_][\w.-]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}

loadDotEnv(path.join(baseDir, '.env'));

const DB_PATH = process.env.DB_PATH;
const PORT = Number(process.env.PORT || 3000);

if (!DB_PATH) {
  fatal([
    '[오류] DB_PATH 설정이 없습니다.',
    `       이 파일과 같은 폴더의 .env 파일에 DB_PATH 를 지정하세요: ${baseDir}`,
    '       예) DB_PATH=Z:\\bep\\bep.db',
  ]);
}

// DB 파일이 들어갈 폴더가 없으면 생성 (NAS 경로 포함)
try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
} catch (e) {
  fatal([
    `[오류] DB 폴더를 만들 수 없습니다: ${path.dirname(DB_PATH)}`,
    '       NAS 경로가 연결되어 있고 쓰기 권한이 있는지 확인하세요.',
    String(e),
  ]);
}

let db;
try {
  // exe 로 묶인 경우 네이티브 바인딩(.node)은 exe 옆 파일에서 직접 읽는다.
  // (pkg 가상 파일시스템에서는 .node 를 로드할 수 없기 때문)
  const dbOptions = isPackaged
    ? { nativeBinding: path.join(baseDir, 'better_sqlite3.node') }
    : undefined;
  db = new Database(DB_PATH, dbOptions);
} catch (e) {
  fatal([`[오류] SQLite 파일을 열 수 없습니다: ${DB_PATH}`, String(e)]);
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

// 빌드된 프런트엔드 정적 서빙 (exe 옆 dist 폴더)
const distDir = path.join(baseDir, 'dist');
app.use(express.static(distDir));
// SPA 폴백 (API 외 경로는 index.html)
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

function openBrowser(url) {
  const cmd =
    process.platform === 'win32' ? `start "" "${url}"` :
    process.platform === 'darwin' ? `open "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, () => { /* 브라우저 자동 열기 실패해도 무시 */ });
}

const server = app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('======================================');
  console.log(' 수압시험 BEP 관리 서버가 켜졌습니다');
  console.log(`  주소     : ${url}`);
  console.log(`  DB 파일  : ${DB_PATH}`);
  console.log('  종료     : 이 창을 닫거나 Ctrl + C');
  console.log('======================================');
  if (isPackaged) openBrowser(url); // 더블클릭 실행 시 브라우저 자동 열기
});

server.on('error', (e) => {
  if (e && e.code === 'EADDRINUSE') {
    fatal([`[오류] 포트 ${PORT} 가 이미 사용 중입니다.`, '       이미 켜져 있거나, .env 의 PORT 를 바꿔보세요.']);
  } else {
    fatal(['[오류] 서버를 시작할 수 없습니다.', String(e)]);
  }
});
