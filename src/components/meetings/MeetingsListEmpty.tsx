import { FileText } from "lucide-react";

interface MeetingsListEmptyProps {
  onCreate: () => void;
  isCreating: boolean;
}

export function MeetingsListEmpty({
  onCreate,
  isCreating,
}: MeetingsListEmptyProps) {
  return (
    <div className="rounded-card bg-card border border-line p-12 text-center">
      <FileText className="w-10 h-10 mx-auto text-muted-ink mb-3" />
      <h2 className="text-lg font-semibold text-ink mb-1">
        아직 회의록이 없어요
      </h2>
      <p className="text-sm text-muted-ink mb-6">
        첫 회의록을 만들어 팀의 기록을 시작해보세요.
      </p>
      <button
        type="button"
        onClick={onCreate}
        disabled={isCreating}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-50"
      >
        {isCreating ? "생성 중..." : "+ 첫 회의록 만들기"}
      </button>
    </div>
  );
}
