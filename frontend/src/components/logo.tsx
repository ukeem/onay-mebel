import { cn } from "@/lib/utils";
import Link from "next/link";

export function Logo({
  className,
  size = "default",
}: {
  className?: string;
  size?: "sm" | "default";
}) {
  const isSmall = size === "sm";

  return (
    <Link
      href="/dashboard/projects"
      className={cn("flex items-center gap-2.5 group", className)}
    >
      {/* Icon mark */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold transition-transform group-hover:scale-105",
          isSmall ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(isSmall ? "h-4 w-4" : "h-[18px] w-[18px]")}
        >
          {/* Stylised sofa / armchair */}
          <path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
          <path d="M2 14a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2z" />
          <path d="M4 17v2" />
          <path d="M20 17v2" />
        </svg>
      </div>
      {/* Wordmark */}
      <div
        className={cn(
          "flex flex-col leading-none justify-center items-center",
          isSmall ? "gap-0.5" : "gap-0.5",
        )}
      >
        <span
          className={cn(
            "font-extrabold uppercase leading-none! tracking-tighter",
            isSmall ? "text-sm" : "text-base",
          )}
        >
          Onay
        </span>
        <span
          className={cn(
            "flex w-full justify-between px-[2px] font-medium uppercase text-muted-foreground",
            isSmall ? "text-[7px]" : "text-[8px]",
          )}
        >
          {"MEBEL".split("").map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </span>
      </div>
    </Link>
  );
}
