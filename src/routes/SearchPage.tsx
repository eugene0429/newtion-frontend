import { useSearchParams } from "react-router-dom";

export default function SearchPage() {
  const [params] = useSearchParams();
  return (
    <h1 className="text-2xl font-bold">
      검색: {params.get("q") ?? ""}
    </h1>
  );
}
