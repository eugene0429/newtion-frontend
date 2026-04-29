import { useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useThemeStore } from "@/store/themeStore";
import {
  lightBlockNoteTheme,
  darkBlockNoteTheme,
} from "./blockNoteTheme";
import type { BlockNoteLikeBlock } from "@/lib/blockAdapter";

interface BlockEditorProps {
  initialContent: BlockNoteLikeBlock[];
  onChange: (blocks: BlockNoteLikeBlock[]) => void;
}

function resolveDark(mode: "system" | "light" | "dark"): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function BlockEditor({
  initialContent,
  onChange,
}: BlockEditorProps) {
  const mode = useThemeStore((s) => s.mode);
  const isDark = useMemo(() => resolveDark(mode), [mode]);
  const theme = isDark ? darkBlockNoteTheme : lightBlockNoteTheme;

  const editor = useCreateBlockNote({
    initialContent: initialContent.length > 0
      ? (initialContent as NonNullable<Parameters<typeof useCreateBlockNote>[0]>["initialContent"])
      : undefined,
  });

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      onChange={() => onChange(editor.document as unknown as BlockNoteLikeBlock[])}
    />
  );
}
