import { useCallback } from 'react';

/** 브라우저 인쇄 기반 PDF 발행 (window.print) */
export function usePrint() {
  return useCallback(() => {
    document.body.classList.add('printing');
    const cleanup = () => {
      document.body.classList.remove('printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    // afterprint 미지원 환경 대비 안전망
    setTimeout(cleanup, 1000);
  }, []);
}
