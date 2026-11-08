/** The ViApp logo mark: >@ prompt and recipient symbol. Same path as public/v-mark.svg. */
export const V_MARK_PATH =
  "M2 4 L9 9.5 L2 15 M19 15.5 C14.5 15.5 12 12.5 12 9.5 C12 6.5 14.5 3.5 19 3.5 C23.5 3.5 25.5 6.5 25.5 10 C25.5 12.5 24 14 22.5 14 C21.2 14 20.2 13 20.2 11.5 L20.2 6.5 M20.2 9.5 C20.2 8 19 7 17.5 7 C16 7 15 8 15 9.5 C15 11 16 12 17.5 12 C18.8 12 19.8 11 20.2 9.5";

export function VMark({ width = 16 }: { width?: number }) {
  return (
    <svg viewBox="0 0 28 18" width={width} height={(width * 18) / 28} fill="none" aria-hidden="true" focusable="false" style={{ color: "var(--gold)", flex: "none" }}>
      <path d={V_MARK_PATH} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
