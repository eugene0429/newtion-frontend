export function errorId(): string {
  // crypto.randomUUID 는 jsdom 25+ 와 모든 모던 브라우저에서 지원.
  // 형식: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" — 앞 8자만 추출.
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2, 10).padEnd(8, "0");
  return uuid.replace(/-/g, "").slice(0, 8);
}
