"use client";

import { heroTimeline } from "@/animations/hero";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const HeroMockup = lazy(() =>
  import("./hero-3d-scene").then((m) => ({ default: m.Hero3DScene })),
);

/* ── Animated counter hook ── */
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const startCount = useCallback(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) startCount();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startCount]);

  return { count, ref };
}

export function HeroSection() {
  const t = useTranslations("landing.hero");
  const containerRef = useRef<HTMLElement>(null);

  const stat1 = useCountUp(500, 2000);
  const stat2 = useCountUp(10000, 2500);
  const stat3 = useCountUp(7, 1000);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      heroTimeline(containerRef.current!);
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center pt-20 lg:pt-16 overflow-hidden"
    >
      {/* Background with parallax */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
        <div
          className="hero-parallax-orb absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px]"
          style={{ willChange: "transform" }}
        />
        <div
          className="hero-parallax-orb-2 absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]"
          style={{ willChange: "transform" }}
        />
        {/* Floating geometric shapes */}
        <div className="animate-float-slow absolute top-[15%] right-[10%] w-16 h-16 border border-primary/10 rounded-xl rotate-12 hidden lg:block" />
        <div className="animate-float-slow-reverse absolute bottom-[20%] left-[8%] w-12 h-12 border border-primary/8 rounded-full hidden lg:block" />
        <div className="animate-float-slow absolute top-[60%] right-[5%] w-8 h-8 bg-primary/5 rounded-lg rotate-45 hidden lg:block" />
        {/* Точечная сетка на фоне */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-12 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Text content */}
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="hero-title mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                {t("microcopy")}
              </span>
            </div>

            <h1 className="hero-title text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.15]">
              <span className="text-foreground">
                {t("title").split("—")[0]}—
              </span>
              <span className="bg-gradient-to-r from-primary via-primary/60 to-primary bg-clip-text text-transparent animate-gradient-text">
                {t("title").split("—")[1] || ""}
              </span>
            </h1>

            <p className="hero-subtitle mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl">
              {t("subtitle")}
            </p>

            <div className="hero-cta mt-10 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                asChild
                className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all group"
              >
                <Link href="/register">
                  {t("cta")}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-6 text-base gap-2 border-border/50 hover:border-border"
              >
                <Play className="h-4 w-4" />
                {t("watchVideo")}
              </Button>
            </div>

            {/* Social proof numbers */}
            <div className="hero-microcopy mt-10 flex items-center justify-center sm:justify-start gap-6 sm:gap-8">
              <div ref={stat1.ref} className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  {stat1.count}+
                </div>
                <div className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("stat1") || "мебельщиков"}
                </div>
              </div>
              <div ref={stat2.ref} className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  {stat2.count >= 1000
                    ? `${Math.floor(stat2.count / 1000)}K+`
                    : `${stat2.count}+`}
                </div>
                <div className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("stat2") || "расчётов"}
                </div>
              </div>
              <div ref={stat3.ref} className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  {stat3.count}
                </div>
                <div className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("stat3") || "дней бесплатно"}
                </div>
              </div>
            </div>
          </div>

          {/* UI Mockup */}
          <div className="hero-3d relative hidden lg:block">
            <Suspense
              fallback={
                <div className="w-full h-full min-h-[400px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <HeroMockup />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
