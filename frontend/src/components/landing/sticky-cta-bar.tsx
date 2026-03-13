"use client";

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

export function StickyCTABar() {
  const t = useTranslations("landing.stickyCta");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.5);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/70 backdrop-blur-2xl border border-border/30 rounded-2xl px-2 pt-2 safe-bottom shadow-lg shadow-black/10 flex items-center justify-center"
        >
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto pb-2">
            <Button
              asChild
              size="sm"
              className="h-10 px-6 text-sm font-semibold shadow-sm shadow-primary/15 rounded-full"
            >
              <Link href="/register">{t("cta")}</Link>
            </Button>
            <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">
              {t("note")}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
