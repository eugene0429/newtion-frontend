import { useParams } from "react-router-dom";

export default function ProjectDetailPage() {
  const { id } = useParams();
  return <p className="mt-4 text-muted-ink">프로젝트 모달 placeholder: {id}</p>;
}
