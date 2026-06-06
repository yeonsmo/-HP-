import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 폐쇄망 배포: 상대 경로(base:'./')로 빌드하여 nginx 하위 경로 어디서든 정적 서빙 가능.
// 외부 CDN/네트워크 의존 없음. 모든 자산은 dist 내부에 번들된다.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
});
