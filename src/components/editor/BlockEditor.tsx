import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { filterSuggestionItems } from "@blocknote/core";
import { useThemeStore } from "@/store/themeStore";
import {
  lightBlockNoteTheme,
  darkBlockNoteTheme,
} from "./blockNoteTheme";
import type { BlockNoteLikeBlock } from "@/lib/blockAdapter";
import type { Page } from "@/types/page";
import { buildMentionItems } from "./buildMentionItems";

interface BlockEditorProps {
  initialContent: BlockNoteLikeBlock[];
  onChange: (blocks: BlockNoteLikeBlock[]) => void;
  /** `@` 입력 시 query 를 받아 멘션 후보 페이지를 비동기로 반환. 미제공 시 멘션 비활성. */
  onMentionSearch?: (query: string) => Promise<Page[]>;
}

const MENTION_HREF_RE = /^\/(meetings|projects)\/[^/?#]+/;

function resolveDark(mode: "system" | "light" | "dark"): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function BlockEditor({
  initialContent,
  onChange,
  onMentionSearch,
}: BlockEditorProps) {
  const mode = useThemeStore((s) => s.mode);
  const isDark = useMemo(() => resolveDark(mode), [mode]);
  const theme = isDark ? darkBlockNoteTheme : lightBlockNoteTheme;
  const navigate = useNavigate();

  const editor = useCreateBlockNote({
    initialContent: initialContent.length > 0
      ? (initialContent as NonNullable<Parameters<typeof useCreateBlockNote>[0]>["initialContent"])
      : undefined,
  });

  const getMentionItems = useCallback(
    async (query: string) => {
      if (!onMentionSearch) return [];
      const pages = await onMentionSearch(query);
      return filterSuggestionItems(
        buildMentionItems(pages, (content) =>
          editor.insertInlineContent(content as never),
        ),
        query,
      );
    },
    [editor, onMentionSearch],
  );

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href) return;
    if (MENTION_HREF_RE.test(href)) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <div onClickCapture={handleContainerClick}>
      <BlockNoteView
        editor={editor}
        theme={theme}
        onChange={() => onChange(editor.document as unknown as BlockNoteLikeBlock[])}
      >
        {onMentionSearch ? (
          <SuggestionMenuController
            triggerCharacter="@"
            getItems={getMentionItems}
          />
        ) : null}
      </BlockNoteView>
    </div>
  );
}
