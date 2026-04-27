import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">404</h1>
      <Link to="/" className="text-brand underline">홈으로</Link>
    </div>
  );
}
