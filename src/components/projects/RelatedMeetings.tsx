import { Link } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePages } from "@/hooks/usePages";
import { formatMeetingDate } from "@/lib/formatMeetingDate";

interface RelatedMeetingsProps {
  projectId: string;
}

export function RelatedMeetings({ projectId }: RelatedMeetingsProps) {
  const { workspaceId } = useWorkspace();
  const query = usePages({ workspaceId, mentionedPageId: projectId });

  if (query.isLoading) {
    return <p className="text-xs text-muted-ink">관련 회의록 로딩...</p>;
  }
  const meetings = query.data ?? [];
  if (meetings.length === 0) {
    return <p className="text-xs text-muted-ink">📎 관련 회의록 없음</p>;
  }

  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-medium text-muted-ink">
        📎 관련 회의록 ({meetings.length})
      </h3>
      <ul className="space-y-1">
        {meetings.map((m) => (
          <li key={m._id}>
            <Link
              to={`/meetings/${m._id}`}
              className="text-sm text-ink hover:text-brand underline-offset-2 hover:underline"
            >
              <span className="text-muted-ink mr-2">
                {formatMeetingDate(m.properties.date)}
              </span>
              {m.title || "제목 없음"}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
