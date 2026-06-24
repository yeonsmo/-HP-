// 배포 폴더(release/)를 구성한다.
// pkg 가 만든 release/bep.exe 옆에 dist/, .env, 사용법.txt 를 둔다.
// 사용자는 release 폴더만 받아 .env 를 수정하고 bep.exe 를 더블클릭하면 된다.

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const release = path.join(root, 'release');

// 윈도우용 exe(node22-win-x64)에는 윈도우용 better_sqlite3.node 가 필요하다.
// 다른 OS 에서 빌드하면 그 OS 의 바인딩이 복사되어 실행 시 깨진다 → 미리 막는다.
if (process.platform !== 'win32') {
  console.error('[오류] 윈도우용 exe 는 반드시 윈도우 PC 에서 빌드해야 합니다.');
  console.error(`       현재 OS: ${process.platform} (필요: win32)`);
  console.error('       윈도우에서 "npm install" 후 "npm run package" 를 실행하세요.');
  process.exit(1);
}

fs.mkdirSync(release, { recursive: true });

// 1) 프런트엔드 빌드 결과 복사
const dist = path.join(root, 'dist');
if (!fs.existsSync(dist)) {
  console.error('[오류] dist 폴더가 없습니다. 먼저 "npm run build" 를 실행하세요.');
  process.exit(1);
}
fs.rmSync(path.join(release, 'dist'), { recursive: true, force: true });
fs.cpSync(dist, path.join(release, 'dist'), { recursive: true });

// 2) better-sqlite3 네이티브 바인딩(.node) 복사 — exe 옆에 두고 직접 로드한다.
const nodeBinding = path.join(root, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
if (!fs.existsSync(nodeBinding)) {
  console.error('[오류] better_sqlite3.node 를 찾을 수 없습니다. "npm install" 을 먼저 실행하세요.');
  console.error('       찾은 경로: ' + nodeBinding);
  process.exit(1);
}
fs.copyFileSync(nodeBinding, path.join(release, 'better_sqlite3.node'));

// 3) .env (없을 때만 생성 — 기존 설정을 덮어쓰지 않음)
const envPath = path.join(release, '.env');
if (!fs.existsSync(envPath)) {
  fs.copyFileSync(path.join(root, '.env.example'), envPath);
}

// 4) 사용법 안내
const guide = `수압시험 BEP 관리 - 사용법

[처음 한 번]
1. 같은 폴더의 ".env" 파일을 메모장으로 엽니다.
2. DB_PATH 를 NAS의 저장 위치로 바꿉니다.
     예) DB_PATH=Z:\\bep\\bep.db
     예) DB_PATH=\\\\NAS\\공유폴더\\내폴더\\bep\\bep.db
   필요하면 PORT 도 바꿉니다(기본 3000).
3. 저장 후 닫습니다.

[매번 사용]
- bep.exe 를 더블클릭하면 검은 창이 뜨고 브라우저가 자동으로 열립니다.
- 다 쓰면 검은 창을 닫으면 종료됩니다.

[주의]
- bep.exe, .env, dist 폴더, better_sqlite3.node 는 항상 같은 폴더에 함께 두세요.
- 데이터는 NAS의 DB_PATH 파일에 저장됩니다. 그 .db 파일을 복사하면 백업입니다.
`;
fs.writeFileSync(path.join(release, '사용법.txt'), guide, 'utf8');

console.log('release 폴더 구성 완료:');
console.log('  ' + release);
console.log('  - bep.exe (pkg 로 생성)');
console.log('  - better_sqlite3.node');
console.log('  - dist/');
console.log('  - .env');
console.log('  - 사용법.txt');
