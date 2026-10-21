"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { key: "features", href: "#features" },
  { key: "howItWorks", href: "#how-it-works" },
  { key: "pricing", href: "#pricing" },
  { key: "faq", href: "#faq" },
] as const;

export function LandingHeader() {
  const t = useTranslations("landing.nav");
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const currentLocale = useLocale();

  const toggleLocale = () => {
    const next = currentLocale === "ru" ? "kz" : "ru";
    document.cookie = `locale=${next};path=/;max-age=31536000`;
    router.refresh();
  };

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docH > 0 ? window.scrollY / docH : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold h-9 w-9 text-sm transition-transform group-hover:scale-105 shadow-sm shadow-primary/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[18px] w-[18px]"
              >
                <path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                <path d="M2 14a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2z" />
                <path d="M4 17v2" />
                <path d="M20 17v2" />
              </svg>
            </div>
            <div className="flex flex-col leading-none justify-center items-center gap-0.5">
              <span className="font-extrabold uppercase leading-none! tracking-tighter text-base">
                Onay
              </span>
              <span className="flex w-full justify-between px-[2px] font-medium uppercase text-muted-foreground text-[8px]">
                {"MEBEL".split("").map((ch, i) => (
                  <span key={i}>{ch}</span>
                ))}
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ key, href }) => (
              <button
                key={key}
                onClick={() => handleNavClick(href)}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
              >
                {t(key)}
              </button>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            {currentLocale && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLocale}
                className="text-xs font-medium text-muted-foreground hover:text-foreground px-2"
              >
                {currentLocale === "ru" ? "Қазақша" : "Русский"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/login">{t("login")}</Link>
            </Button>
            <Button asChild className="shadow-sm shadow-primary/20">
              <Link href="/register">{t("tryFree")}</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-1">
            {currentLocale && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLocale}
                className="text-xs font-medium text-muted-foreground hover:text-foreground px-2"
              >
                {currentLocale === "ru" ? "Қаз" : "Рус"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-border bg-background/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {NAV_LINKS.map(({ key, href }) => (
                <button
                  key={key}
                  onClick={() => handleNavClick(href)}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
                >
                  {t(key)}
                </button>
              ))}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Button variant="outline" asChild className="w-full">
                  <Link href="/login">{t("login")}</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href="/register">{t("tryFree")}</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll progress bar */}
      {scrolled && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent">
          <div
            className="scroll-progress h-full bg-gradient-to-r from-primary/80 to-primary/40"
            style={{ transform: `scaleX(${scrollProgress})` }}
          />
        </div>
      )}
    </header>
  );
}
