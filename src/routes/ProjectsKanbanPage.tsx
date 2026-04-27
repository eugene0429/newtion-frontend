import { Outlet } from "react-router-dom";

export default function ProjectsKanbanPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">프로젝트</h1>
      <Outlet />
    </>
  );
}
