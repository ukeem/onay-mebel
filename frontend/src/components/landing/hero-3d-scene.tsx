"use client";

import { motion } from "framer-motion";
import {
  ChevronRight,
  Copy,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Settings2,
  Sun,
  Trash2,
} from "lucide-react";

/* ── Floating wrapper (CSS keyframes for GPU animation) ── */
function FloatingCard({
  children,
  className = "",
  delay = 0,
  duration = 6,
  distance = 8,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  distance?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      <div
        className="will-change-transform"
        style={{
          animation: `heroFloat ${duration}s ease-in-out ${delay}s infinite`,
          ["--float-distance" as string]: `${distance}px`,
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

/* ── Onay logo SVG (reusable) ── */
function OnayLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const s = size === "sm";
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${s ? "h-4 w-4" : "h-6 w-6"} rounded-md bg-foreground/90 flex items-center justify-center`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={s ? "h-2 w-2" : "h-3 w-3"}
        >
          <path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
          <path d="M2 14a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2z" />
        </svg>
      </div>
      <div className="leading-none">
        <div
          className={`${s ? "text-[7px]" : "text-[9px]"} font-extrabold tracking-tight text-foreground/85`}
        >
          ONAY
        </div>
        <div
          className={`${s ? "text-[4px]" : "text-[5px]"} tracking-[0.15em] text-muted-foreground/40 font-medium`}
        >
          MEBEL
        </div>
      </div>
    </div>
  );
}

/* ── Project row ── */
const PROJECTS = [
  {
    name: "ЖК Алтын Орда МДФ",
    client: "Айбек",
    phone: "87012345678",
    date: "11.03.2026",
  },
  {
    name: "Коттедж Бостандык",
    client: "Дамир",
    phone: "87071234567",
    date: "05.03.2026",
  },
  {
    name: "Квартира Манас ЛДСП",
    client: "Нурлан",
    phone: "87019876543",
    date: "28.02.2026",
  },
];

function ProjectRow({
  project,
  delay,
}: {
  project: (typeof PROJECTS)[0];
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group rounded-xl border border-border/30 bg-card/80 hover:bg-card hover:border-border/50 hover:shadow-md hover:shadow-black/[0.03] dark:hover:shadow-black/10 transition-all duration-300"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200/30 dark:border-amber-500/10 flex items-center justify-center shrink-0">
          <FolderOpen className="h-4 w-4 text-amber-600/70 dark:text-amber-400/60" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-foreground/90 truncate">
            {project.name}
          </div>
          <div className="text-[10px] text-muted-foreground/50 mt-0.5">
            {project.client} {project.phone} · {project.date}
          </div>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted/60 cursor-default">
            <Copy className="h-3 w-3 text-muted-foreground/40" />
          </div>
          <div className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted/60 cursor-default">
            <Pencil className="h-3 w-3 text-muted-foreground/40" />
          </div>
          <div className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-500/10 cursor-default">
            <Trash2 className="h-3 w-3 text-red-400/50" />
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/25 shrink-0 group-hover:text-muted-foreground/50 transition-colors" />
      </div>
    </motion.div>
  );
}

/* ── Main dashboard mockup ── */
function DashboardMockup() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-2xl overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-b from-muted/60 to-muted/40 border-b border-border/30">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.1)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.1)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.1)]" />
        </div>
        <div className="flex-1 mx-6 h-5 rounded-md bg-background/60 border border-border/20 flex items-center justify-center">
          <span className="text-[8px] text-muted-foreground/35 select-none font-medium">
            onaymebel.kz/dashboard/projects
          </span>
        </div>
      </div>

      {/* App layout */}
      <div className="flex min-h-[340px]">
        {/* Sidebar */}
        <div className="w-[140px] border-r border-border/20 bg-gradient-to-b from-muted/10 to-muted/5 py-3 px-2 flex-col hidden sm:flex">
          <div className="px-2 mb-5">
            <OnayLogo />
          </div>

          <div className="space-y-0.5">
            {[
              { icon: LayoutDashboard, label: "Проекты", active: true },
              { icon: Settings2, label: "Параметры" },
              { icon: FileText, label: "CRM" },
            ].map(({ icon: Icon, label, active }, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] transition-all ${
                  active
                    ? "bg-foreground/90 text-background font-semibold shadow-sm"
                    : "text-muted-foreground/45 hover:text-muted-foreground/65 hover:bg-muted/30"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 bg-gradient-to-br from-transparent to-muted/5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold text-foreground/85">Проекты</div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex items-center gap-1 h-7 px-3 rounded-lg bg-foreground/90 text-background text-[10px] font-semibold shadow-sm hover:bg-foreground transition-colors cursor-default"
            >
              <Plus className="h-3 w-3" />
              Новый проект
            </motion.div>
          </div>

          <div className="space-y-2">
            {PROJECTS.map((project, i) => (
              <ProjectRow key={i} project={project} delay={0.7 + i * 0.15} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mobile projects data ── */
const MOBILE_PROJECTS = [
  {
    name: "Студия Сарыарка",
    client: "Асель",
    phone: "87017891234",
    date: "10.03.2026",
  },
  {
    name: "Таунхаус Есиль",
    client: "Марат",
    phone: "87053214567",
    date: "02.03.2026",
  },
];

/* ── Mobile mockup in phone frame ── */
function MobileMockup() {
  return (
    <div className="relative">
      {/* Phone frame */}
      <div className="rounded-[22px] bg-gradient-to-b from-neutral-800 to-neutral-900 dark:from-neutral-700 dark:to-neutral-800 p-[3px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
        <div className="rounded-[19px] overflow-hidden bg-card w-[175px] min-h-[340px] flex flex-col relative">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[10px] bg-neutral-900 dark:bg-neutral-700 rounded-b-lg z-30" />

          {/* Status bar */}
          <div className="flex items-center justify-between px-3 pt-3 pb-1.5 bg-card border-b border-border/20">
            <OnayLogo size="sm" />
            <div className="flex items-center gap-1.5">
              <span className="text-[5px] text-muted-foreground/40 font-medium">
                Қазақша
              </span>
              <Sun className="h-2 w-2 text-muted-foreground/35" />
              <LogOut className="h-2 w-2 text-muted-foreground/35" />
            </div>
          </div>

          {/* Content */}
          <div className="px-2.5 py-2 flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[9px] font-bold text-foreground/85">
                Проекты
              </div>
              <div className="flex items-center gap-0.5 h-[18px] px-1.5 rounded-md bg-foreground/90 text-background text-[6px] font-semibold">
                <Plus className="h-1.5 w-1.5" />
                Новый проект
              </div>
            </div>

            <div className="space-y-1.5">
              {MOBILE_PROJECTS.map((project, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: 1.1 + i * 0.15,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="rounded-lg border border-border/30 bg-card/80 p-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-md bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200/20 dark:border-amber-500/10 flex items-center justify-center shrink-0">
                      <FolderOpen className="h-2 w-2 text-amber-600/60 dark:text-amber-400/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[7px] font-semibold text-foreground/85 truncate">
                        {project.name}
                      </div>
                      <div className="text-[5px] text-muted-foreground/45 mt-px leading-tight">
                        {project.client} {project.phone} · {project.date}
                      </div>
                    </div>
                    <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/25 shrink-0" />
                  </div>
                  <div className="flex items-center justify-end gap-px mt-1">
                    <div className="h-3.5 w-3.5 rounded flex items-center justify-center">
                      <Copy className="h-1.5 w-1.5 text-muted-foreground/35" />
                    </div>
                    <div className="h-3.5 w-3.5 rounded flex items-center justify-center">
                      <Pencil className="h-1.5 w-1.5 text-muted-foreground/35" />
                    </div>
                    <div className="h-3.5 w-3.5 rounded flex items-center justify-center">
                      <Trash2 className="h-1.5 w-1.5 text-red-400/45" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom tabs */}
          <div className="flex items-center justify-around border-t border-border/20 bg-card px-1 py-1.5 mt-auto">
            {[
              { icon: LayoutDashboard, label: "Проекты", active: true },
              { icon: Settings2, label: "Параметры" },
              { icon: FileText, label: "CRM" },
              { icon: Menu, label: "Ещё" },
            ].map(({ icon: Icon, label, active }, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <Icon
                  className={`h-2 w-2 ${active ? "text-foreground/85" : "text-muted-foreground/35"}`}
                />
                <span
                  className={`text-[4px] ${active ? "text-foreground/85 font-semibold" : "text-muted-foreground/35"}`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero3DScene() {
  return (
    <div className="hero-3d relative w-full h-full min-h-[400px] lg:min-h-[520px]">
      {/* CSS keyframes for smooth GPU-accelerated float */}
      <style>{`
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(calc(-1 * var(--float-distance, 8px))); }
        }
        @keyframes heroShine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Ambient glow effects */}
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-primary/8 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[250px] bg-primary/5 rounded-full blur-[80px] -z-10" />

      {/* Desktop mockup — slight perspective tilt */}
      <FloatingCard
        className="relative z-10"
        delay={0.2}
        duration={7}
        distance={6}
      >
        <div
          className="transition-transform duration-700 hover:scale-[1.01]"
          style={{
            transform: "perspective(1200px) rotateY(-2deg) rotateX(1deg)",
          }}
        >
          <DashboardMockup />
          {/* Shine overlay */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none opacity-30 dark:opacity-15"
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.05) 50%, transparent 55%)",
              backgroundSize: "200% 100%",
              animation: "heroShine 6s ease-in-out infinite",
            }}
          />
        </div>
      </FloatingCard>

      {/* Mobile mockup — overlapping bottom right */}
      <FloatingCard
        className="absolute -bottom-6 -right-2 z-20"
        delay={0.7}
        duration={8}
        distance={10}
      >
        <div
          style={{
            transform: "perspective(800px) rotateY(3deg) rotateX(-1deg)",
          }}
        >
          <MobileMockup />
        </div>
      </FloatingCard>
    </div>
  );
}
