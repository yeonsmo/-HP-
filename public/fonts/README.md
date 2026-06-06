# 로컬 폰트 배치 안내 (Pretendard)

이 앱은 폐쇄망 전용으로, 외부 폰트/CDN 호출을 포함하지 않습니다.
한글 렌더링 일관성을 위해 Pretendard woff2 파일을 이 디렉터리에 직접 배치합니다.

## 배치할 파일

아래 파일명을 그대로 사용하세요(`src/styles/global.css` 의 @font-face 와 일치).

- `Pretendard-Regular.woff2` (weight 400)
- `Pretendard-SemiBold.woff2` (weight 600)
- `Pretendard-Bold.woff2` (weight 700)

빌드 시 `public/` 의 파일은 `dist/` 루트로 그대로 복사되어 `/fonts/...` 경로로 서빙됩니다.

## 파일이 없을 경우

woff2 파일이 없어도 앱은 정상 동작합니다. 이 경우 시스템 한글 폰트
(맑은 고딕 등)로 폴백되어 화면과 인쇄(PDF) 모두 한글이 정상 표시됩니다.
다만 PC 별 렌더링 차이를 없애려면 위 woff2 파일을 배치하는 것을 권장합니다.

## 라이선스

Pretendard 는 SIL Open Font License 1.1 로 배포됩니다. 사내 배포 시 라이선스
파일(OFL.txt)을 함께 포함하세요.
