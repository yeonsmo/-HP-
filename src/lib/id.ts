// 외부 의존 없는 ID 생성 (브라우저 내장 crypto 사용)

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 폴백: 충분히 고유한 임의 문자열
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
