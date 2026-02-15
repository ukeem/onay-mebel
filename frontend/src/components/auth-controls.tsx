"use client";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

/**
 * Theme and locale controls for auth pages (login, register, reset).
 * Positioned at top-right corner.
 */
export function AuthControls() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations();

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-1">
      <LocaleSwitcher />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={t("common.toggleTheme")}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
    </div>
  );
}
