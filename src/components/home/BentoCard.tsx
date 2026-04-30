import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

type AccentColor = "teal" | "orange" | "pink" | "violet" | "sky";

interface Props {
  title: string;
  accent?: AccentColor;
  span?: "1x1" | "2x1" | "1x2";
  seeMoreHref?: string;
  className?: string;
  children: React.ReactNode;
}

const ACCENT_BORDER: Record<AccentColor, string> = {
  teal: "before:bg-brand",
  orange: "before:bg-cta",
  pink: "before:bg-tag-pink",
  violet: "before:bg-tag-violet",
  sky: "before:bg-tag-sky",
};

const SPAN: Record<NonNullable<Props["span"]>, string> = {
  "1x1": "col-span-1 row-span-1",
  "2x1": "col-span-2 row-span-1",
  "1x2": "col-span-1 row-span-2",
};

export function BentoCard({
  title,
  accent = "teal",
  span = "1x1",
  seeMoreHref,
  className,
  children,
}: Props) {
  return (
    <section
      className={cn(
        "relative rounded-card bg-card border border-line p-4",
        "shadow-elevation transition-shadow hover:shadow-elevation-hover",
        "before:content-[''] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-0.5 before:rounded",
        ACCENT_BORDER[accent],
        SPAN[span],
        className,
      )}
    >
      <header className="flex items-center justify-between mb-3 pl-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {seeMoreHref ? (
          <Link
            to={seeMoreHref}
            className="inline-flex items-center gap-1 text-xs text-muted-ink hover:text-ink"
          >
            모두 보기
            <ArrowRight className="w-3 h-3" />
          </Link>
        ) : null}
      </header>
      <div className="pl-2">{children}</div>
    </section>
  );
}
