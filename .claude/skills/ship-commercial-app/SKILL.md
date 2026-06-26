---
name: ship-commercial-app
description: >-
  Use when turning a working app into something distributable or sellable —
  i.e. the user says things like "상용화", "판매", "배포", "production-ready",
  "make it sellable/shippable", or asks "what do I need to ship/sell this app".
  Covers the NON-business-logic engineering: distribution model choice,
  packaging, code signing, installers, auto-update, licensing, data safety,
  security, CI/CD, and legal docs. NOT for writing the app's feature/calc logic.
---

# 상용화 가능한 앱 출시 플레이북 (Ship a commercial-grade app)

기능(계산·도메인 로직)은 이미 동작한다고 가정한다. 이 스킬은 **"파는/배포하는 제품"**으로
만들기 위한 **순수 기술·운영 요소**를 다룬다. 과하게 만들지 말고, 아래 순서로 **규모에 맞게**
필요한 것만 적용한다.

## 0. 먼저 배포 모델을 정한다 (이게 모든 걸 좌우함)

질문해서 분기하라:

- **내부용(1인/소수, 같은 회사)** → 패키징 + 데이터 백업 정도면 끝. 서명·과금·멀티테넌시 전부 불필요.
- **데스크톱 앱 판매(개인거래/소규모 B2B)** → 코드 서명 + 설치/업데이트 + (선택)라이선스 키.
- **SaaS(웹서비스)** → 위 + 인증/인가, 멀티테넌시, 인프라, 모니터링까지 전부.

데스크톱이면 **Tauri(경량, Rust) / Electron(무겁지만 Node 재사용)** 중 택1.
SaaS면 프런트(웹) + 백엔드 API + DB + 호스팅을 분리한다.

## 1. 우선순위 체크리스트 (P0 = 팔기 전 필수)

### P0 — 신뢰와 데이터 안전
- **코드 서명 (Code Signing)** — 서명 없는 exe는 Windows SmartScreen / **Smart App Control**이
  *실행 자체를 차단*하거나 "알 수 없는 게시자" 경고를 띄운다. 유료 배포엔 사실상 필수.
  - Windows: OV/EV 코드서명 인증서(연 10~40만원), `signtool`로 서명. CI에 시크릿으로 인증서 주입.
  - macOS: Apple Developer + `codesign` + **notarization(공증)** 필요.
- **재현 가능한 빌드 (CI build)** — 로컬 환경 문제/서명 차단을 피하려면 **GitHub Actions에서
  OS별 러너(windows-latest 등)로 빌드**하고 산출물을 아티팩트/릴리스로 받는다.
  네이티브 모듈은 타깃 OS에서 빌드해야 함(크로스 빌드 금지).
- **백업·복구 (Backup / Recovery)** — 데이터 유실 대비. 파일 DB면 파일 복사 + 앱 내 내보내기/가져오기.
  저장 실패는 **조용히 삼키지 말고 사용자에게 표시**(silent data loss 방지).
- **데이터 무결성** — 저장 경계에서 입력 검증, 트랜잭션, 복원 시 "전체 검증 후 적용".

### P1 — 배포 경험과 보호
- **설치 프로그램 (Installer)** — Windows: NSIS/MSI(Tauri/electron-builder 내장), macOS: dmg/pkg.
  또는 "포터블"(단일 실행파일 + 설정파일).
- **자동 업데이트 (Auto-update)** — Tauri updater / electron-updater. 서명과 세트로 동작.
- **버전 관리 (SemVer)** — `MAJOR.MINOR.PATCH`. 빌드에 버전·커밋 해시 임베드.
- **라이선스 키 / 활성화** — 복제 방지가 필요하면. 오프라인이면 서명된 키 검증 방식.
- **크래시 리포팅 / 텔레메트리** — 남의 PC에서 터진 오류 수집(Sentry 등). 단, **수집 고지 + 동의**.

### P2 — 사용자/법무/품질 마감
- **이용약관(ToS) + 개인정보처리방침(Privacy Policy)** — 개인정보 다루면 필수(개인정보보호법/GDPR).
- **오픈소스 라이선스 준수** — 사용한 라이브러리 라이선스 표기(특히 GPL 계열 주의).
- **온보딩/도움말, 고객지원 채널**.
- **접근성(a11y) / 국제화(i18n)** — 대상이 넓으면.
- **자동 테스트(단위/통합/E2E) + CI 게이트** — 회귀 방지.

## 2. 데스크톱 앱(Tauri/Electron) 구체 절차

1. **패키징 설정**: 앱 이름·식별자(identifier)·아이콘(.ico/.icns)·창 크기·버전.
2. **보안 하드닝**:
   - WebView **CSP 설정**(`default-src 'self'` 기반; 차트 등 인라인 스타일 쓰면 `style-src 'unsafe-inline'`).
   - 로컬 HTTP 서버를 쓴다면 **반드시 `127.0.0.1`만 바인딩**(0.0.0.0 금지) + CSRF/Origin 점검.
   - 외부 네트워크가 필요 없으면 아예 차단(폐쇄망 친화).
3. **네이티브 모듈 주의**: OS 전용 바이너리는 그 OS에서 빌드. CI 매트릭스로 OS별 산출물 생성.
4. **서명 → 공증 → 설치본/포터블 산출 → 자동업데이트 피드** 순으로 파이프라인 구성.
5. **데이터 위치**: 사용자가 지정 가능하게(설정파일/대화상자). 네트워크 공유(NAS)면 WAL 대신
   `journal_mode=DELETE` + `synchronous=FULL` 등 공유 안전 설정.

## 3. SaaS로 갈 때 추가되는 것
- **인증/인가**(로그인, 역할), **멀티테넌시**(고객 데이터 격리), **마이그레이션**(DB 스키마 버전),
  **모니터링/로깅/알림**, **확장성**(동시성), **결제 연동(PG/구독)**, **인프라(IaC)**, **백업 자동화**.

## 4. 마무리 검증 (출시 전 점검)
- [ ] 깨끗한 OS(클린 VM)에서 설치 → 실행 → 경고 없는지(서명 확인).
- [ ] 업데이트 1회 라운드트립 동작.
- [ ] 데이터 백업→삭제→복원 시 동일.
- [ ] 네트워크/저장소 실패를 사용자에게 명확히 표시(무음 유실 없음).
- [ ] 보안 점검(시크릿 미커밋, 로컬 서버 바인딩, CSP, 의존성 취약점).
- [ ] 버전·라이선스·약관 표기.

## 용어 빠른표 (jargon → 뜻 → 대표 도구)
| 용어 | 뜻 | 도구/예시 |
|---|---|---|
| Code Signing | 실행파일 정품 서명(경고 제거) | signtool, codesign, EV 인증서 |
| Notarization | (macOS) Apple 공증 | `notarytool` |
| Installer | 설치 프로그램 | NSIS, MSI, dmg, electron-builder |
| Auto-update | 자동 업데이트 | Tauri updater, electron-updater |
| CI/CD | 자동 빌드·배포 | GitHub Actions |
| Crash Reporting | 오류 자동 수집 | Sentry |
| Multi-tenancy | 고객 데이터 격리(SaaS) | (DB 설계) |
| SemVer | 버전 규칙 | `1.2.3` |
| ToS / Privacy Policy | 약관/개인정보처리방침 | (법무) |

## 원칙
- **규모에 맞춰라.** 내부용에 SaaS 운영요소를 끼얹지 말 것. 개인거래 데스크톱이면 P0(서명·CI·백업)에 집중.
- **데이터는 절대 조용히 잃지 마라.** 모든 저장 실패는 사용자에게 보인다.
- **빌드는 재현 가능해야 한다.** "내 PC에선 됨"을 없애려고 CI에서 빌드한다.
