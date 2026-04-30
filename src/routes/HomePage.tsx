import { useRecentPages } from "@/hooks/useRecentPages";
import { HomeSkeleton } from "@/components/skeletons/HomeSkeleton";
import { ProjectsInProgressCard } from "@/components/home/ProjectsInProgressCard";
import { QuickActionsCard } from "@/components/home/QuickActionsCard";
import { RecentMeetingsCard } from "@/components/home/RecentMeetingsCard";
import { RecentChangesCard } from "@/components/home/RecentChangesCard";
import { FavoritesCard } from "@/components/home/FavoritesCard";

export default function HomePage() {
  // 한 훅의 isLoading 으로 전체 첫 마운트 페이즈를 대표.
  // useRecentPages 가 모든 카드 중 가장 광범위한 query 라 첫 동기화가 가장 늦다.
  const recent = useRecentPages(1);
  if (recent.isLoading) return <HomeSkeleton />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">홈</h1>
        <p className="text-sm text-muted-ink mt-1">
          오늘의 변경 사항과 진행 상황
        </p>
      </header>
      <div className="grid grid-cols-3 gap-5 auto-rows-min">
        <ProjectsInProgressCard />
        <QuickActionsCard />
        <RecentMeetingsCard />
        <RecentChangesCard />
        <FavoritesCard />
      </div>
    </div>
  );
}
