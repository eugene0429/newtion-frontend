import type { Theme } from "@blocknote/mantine";

/**
 * BlockNote Mantine theme 매핑.
 * 우리 디자인 토큰과 정확히 일치하도록 라이트/다크 두 개를 정의한다.
 * 실제 컬러 값은 :root / .dark CSS 변수에서 읽지 못하므로(BlockNote는 직접 hex/HSL 문자열을 요구) 정적으로 미러링.
 * 토큰 변경 시 src/index.css와 함께 이 파일도 업데이트할 것.
 */

export const lightBlockNoteTheme: Theme = {
  colors: {
    editor: { text: "#0F172A", background: "#FFFFFF" },
    menu: { text: "#0F172A", background: "#FFFFFF" },
    tooltip: { text: "#FFFFFF", background: "#0F172A" },
    hovered: { text: "#0F172A", background: "#F1F5F9" },
    selected: { text: "#0F172A", background: "#CCFBF1" },
    disabled: { text: "#94A3B8", background: "#F5F5F7" },
    shadow: "#E2E8F0",
    border: "#E2E8F0",
    sideMenu: "#475569",
    highlights: {},
  },
  borderRadius: 8,
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
};

export const darkBlockNoteTheme: Theme = {
  colors: {
    editor: { text: "#F1F5F9", background: "#171717" },
    menu: { text: "#F1F5F9", background: "#171717" },
    tooltip: { text: "#0F172A", background: "#F1F5F9" },
    hovered: { text: "#F1F5F9", background: "#262626" },
    selected: { text: "#F1F5F9", background: "#134E4A" },
    disabled: { text: "#64748B", background: "#0A0A0A" },
    shadow: "#000000",
    border: "#262626",
    sideMenu: "#94A3B8",
    highlights: {},
  },
  borderRadius: 8,
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
};
