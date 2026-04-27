import { useParams } from "react-router-dom";

export default function MeetingDetailPage() {
  const { id } = useParams();
  return <h1 className="text-2xl font-bold">회의록 {id}</h1>;
}
