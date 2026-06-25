# 수압시험 BEP 관리 (HP Engineering)

폐쇄망(air-gapped) 보안 환경 전용 손익분기점(BEP) 관리 웹앱.
외부 네트워크 통신이 전혀 없습니다(사내 NAS와 로컬 서버만 사용).

- 기술 스택: 프런트엔드 React + TypeScript + Vite(차트 recharts), 백엔드 Node + Express
- 저장소: 사내 NAS의 지정 폴더에 보관되는 SQLite 파일 (경로는 `.env` 의 `DB_PATH`)
- 구조: 브라우저 → 로컬 중계 서버 1개 → NAS의 `.db` 파일
- 백업/복원: JSON 파일 내보내기/불러오기
- 발행: 브라우저 인쇄 기반(window.print) PDF, 한글 인쇄 스타일 별도

## 핵심 원칙

- 외부 네트워크 호출/CDN/외부 폰트를 어떤 형태로도 포함하지 않습니다.
- 사용자가 입력한 데이터를 임의로 삭제하지 않습니다(모든 변경은 사용자 조작).
- 급여·보험료 등은 직접 입력값을 계산 기준으로 하며, 자동 계산값은 보조 참고용으로만 표시합니다.
- 손익과 BEP 판정은 항상 월 단위로 고정합니다.

## 설정 (.env)

처음 한 번 `.env` 파일을 만듭니다(`.env.example` 복사). NAS의 SQLite 파일 경로를 지정합니다.

```
DB_PATH=/mnt/nas/bep/bep.db      # NAS 폴더 경로 (윈도우 예: Z:\bep\bep.db)
PORT=3000                        # 접속 포트
```

## 실행 (실사용 - 혼자 사용)

```bash
npm install        # 처음 한 번 (인터넷 필요)
npm run build      # 처음 한 번 / 코드 변경 시 (이후 인터넷 불필요)
npm run server     # 서버 실행 → 브라우저에서 http://localhost:3000 접속
```

`npm start` 는 빌드와 서버 실행을 한 번에 합니다.

## 윈도우 실행 파일(.exe) 만들기 — 한 번만

Node 설치 없이 더블클릭으로 켜지는 `bep.exe` 를 만듭니다. **반드시 윈도우 PC에서**
빌드해야 합니다(네이티브 모듈이 OS 전용이라 다른 OS에서 만든 exe 는 윈도우에서 동작하지 않음).

```bash
npm install          # 처음 한 번 (인터넷 필요)
npm run package      # 빌드 + exe 생성 → release\ 폴더
```

`release\` 폴더가 만들어지며 다음이 들어갑니다. **이 폴더를 통째로** 사용·배포하세요.

```
release\
  bep.exe              실행 파일 (Node 내장)
  better_sqlite3.node  DB 엔진 (exe 옆에 반드시 함께)
  dist\                화면 파일
  .env                 ← DB_PATH 를 NAS 경로로 수정
  사용법.txt
```

사용: `.env` 의 `DB_PATH` 를 NAS 경로로 바꾼 뒤 **`bep.exe` 더블클릭** → 브라우저가
자동으로 열립니다. 검은 창을 닫으면 종료됩니다. (Node 설치 불필요)

## 독립 데스크톱 앱(Tauri) 만들기 — 권장

브라우저 탭이 아니라 **자체 창을 가진 진짜 데스크톱 앱**(초경량)으로 빌드합니다.
데이터는 동일하게 NAS 의 SQLite 파일에 저장됩니다. **반드시 윈도우 PC에서** 빌드하세요.

사전 준비(윈도우, 한 번):
- [Rust](https://rustup.rs) 설치
- Microsoft C++ Build Tools (Visual Studio Build Tools)
- WebView2 런타임 — Windows 10/11 에는 기본 포함(엣지). 없으면 MS 에서 설치.

빌드:
```bash
npm install
npm run tauri:build      # 프런트엔드 빌드 + 네이티브 앱 컴파일(--no-bundle)
```

포터블 배포: 빌드 후 아래 실행 파일을 폴더에 두고 `.env` 를 함께 둡니다.
```
src-tauri\target\release\bep.exe   ← 이 파일을 원하는 폴더로 복사(이름 변경 가능)
.env                               ← DB_PATH 를 NAS 경로로 (없으면 exe 옆 data\bep.db 사용)
```
`bep.exe` 더블클릭 → 단독 창으로 앱이 열립니다. (별도 콘솔창·브라우저 불필요)

개발: `npm run tauri:dev` (Vite + Rust 백엔드를 함께 띄움).

> 참고: 프런트엔드(`src/lib/db/database.ts`)는 실행 환경을 감지해, Tauri 앱이면
> Rust 백엔드를 IPC 로 호출하고, 일반 웹/서버(exe)면 `/api` 를 호출합니다. 두 배포
> 방식(Tauri 앱 / Node 서버)이 같은 코드로 모두 동작합니다.

## 개발

```bash
npm run test         # 계산 로직 단위 테스트 (vitest)
npm run dev:server   # 백엔드 서버(자동 재시작) — 터미널 1
npm run dev          # 프런트엔드 개발 서버(/api 는 백엔드로 프록시) — 터미널 2
```

## 폰트 (Pretendard)

한글 렌더링 일관성을 위해 Pretendard woff2 파일을 `public/fonts/` 에 배치합니다.
파일명과 배치 방법은 `public/fonts/README.md` 를 참고하세요. 파일이 없어도 시스템
한글 폰트로 폴백되어 화면과 인쇄 모두 정상 동작합니다.

## 데이터 저장과 안전성

- 입력 데이터는 모두 NAS의 `DB_PATH` SQLite 파일에 저장됩니다(브라우저에 보관하지 않음).
- 백업은 이 `.db` 파일을 복사하거나, 화면의 JSON 백업 기능을 사용합니다.
- 네트워크 공유(NAS) 안전을 위해 WAL 저널을 쓰지 않고(`journal_mode=DELETE`),
  데이터 무결성을 우선합니다(`synchronous=FULL`).
- 본 앱은 단일 서버 프로세스만 NAS 파일을 다루는 1인 사용 전제로 구성되어 있습니다.
  여러 PC에서 같은 `.db` 파일을 동시에 직접 열면 파일이 손상될 수 있으므로 권장하지 않습니다.

## 계산 개요

- 월 고정비 F = Σ직원(세전급여 + 직접입력 4대보험 + DC부담금) + (대표보수 + 대표 4대보험) + Σ기타고정지출
- 매출 R, 총 EA Q, 가중평균 단가 P = R/Q
- EA당 변동비: 당월 / 누적 가중(전체 기간) 토글 (기본값 누적)
- BEP 방식 A(품목군별 EA당)와 방식 B(매출 비례 변동비율)를 비교
- 거래처별 손익, 당월 달성 현황(달성률·안전한계율·당월 손익)

모든 단가·금액은 부가가치세 제외 공급가액 기준, 손익은 영업이익 기준입니다.

## 검증 체크리스트

1. 오프라인(외부 네트워크 차단)에서 서버 실행 및 NAS 파일 읽기/쓰기 정상 동작.
2. 서버 재시작 후에도 NAS의 `.db` 파일에 데이터가 유지됨.
3. 균일 구성 데이터에서 방식 A·B BEP 일치, 치우친 구성에서 괴리(단위 테스트 포함).
4. JSON 백업 후 복원 시 데이터 동일 유지.
5. PDF 발행 시 한글·숫자 정상 출력.
