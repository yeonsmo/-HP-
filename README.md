# 수압시험 BEP 관리 (HP Engineering)

폐쇄망(air-gapped) 보안 서버 전용 손익분기점(BEP) 관리 웹앱.
외부 네트워크 통신이 전혀 없는 순수 클라이언트 사이드 단일 페이지 애플리케이션입니다.

- 기술 스택: React + TypeScript + Vite, 차트 recharts
- 저장소: 브라우저 IndexedDB (외부 저장소 미사용)
- 백업/복원: JSON 파일 내보내기/불러오기
- 발행: 브라우저 인쇄 기반(window.print) PDF, 한글 인쇄 스타일 별도
- 배포: 빌드 결과물(`dist`)을 nginx 정적 서빙

## 핵심 원칙

- 외부 네트워크 호출/CDN/외부 폰트를 어떤 형태로도 포함하지 않습니다.
- 사용자가 입력한 데이터를 임의로 삭제하지 않습니다(모든 변경은 사용자 조작).
- 급여·보험료 등은 직접 입력값을 계산 기준으로 하며, 자동 계산값은 보조 참고용으로만 표시합니다.
- 손익과 BEP 판정은 항상 월 단위로 고정합니다.

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm run test     # 계산 로직 단위 테스트 (vitest)
npm run build    # 타입체크 + 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

## 폰트 (Pretendard)

한글 렌더링 일관성을 위해 Pretendard woff2 파일을 `public/fonts/` 에 배치합니다.
파일명과 배치 방법은 `public/fonts/README.md` 를 참고하세요. 파일이 없어도 시스템
한글 폰트로 폴백되어 화면과 인쇄 모두 정상 동작합니다.

## nginx 배포

`npm run build` 후 `dist/` 를 정적 서빙합니다. 자산은 상대 경로(`./assets/...`)로
참조되어 하위 경로 배포도 가능합니다. 폰트는 `/fonts/...` 절대 경로로 참조되므로
하위 경로 배포 시에는 서버 루트의 `/fonts/` 에 woff2 를 두거나 루트 경로로 서빙하세요.

```nginx
server {
  listen 80;
  root /var/www/bep/dist;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```

## 계산 개요

- 월 고정비 F = Σ직원(세전급여 + 직접입력 4대보험 + DC부담금) + (대표보수 + 대표 4대보험) + Σ기타고정지출
- 매출 R, 총 EA Q, 가중평균 단가 P = R/Q
- EA당 변동비: 당월 / 누적 가중(전체 기간) 토글 (기본값 누적)
- BEP 방식 A(품목군별 EA당)와 방식 B(매출 비례 변동비율)를 비교
- 거래처별 손익, 당월 달성 현황(달성률·안전한계율·당월 손익)

모든 단가·금액은 부가가치세 제외 공급가액 기준, 손익은 영업이익 기준입니다.

## 검증 체크리스트

1. 오프라인(네트워크 차단)에서 `dist` 정상 동작.
2. 균일 구성 데이터에서 방식 A·B BEP 일치, 치우친 구성에서 괴리(단위 테스트 포함).
3. JSON 백업 후 복원 시 데이터 동일 유지.
4. PDF 발행 시 한글·숫자 정상 출력.
