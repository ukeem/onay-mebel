"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function WhySection() {
  const t = useTranslations("landing.why");
  const rows = t.raw("rows") as string[][];

  return (
    <section className="relative py-24 sm:py-32 bg-muted/20 overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[100px] -z-10" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold">{t("title")}</h2>
          <div className="mt-3 mx-auto h-1 w-12 rounded-full bg-primary/40" />
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-md">
          <div className="grid grid-cols-2">
            <div className="px-6 py-4 bg-destructive/8 border-b border-border">
              <span className="text-sm font-semibold text-destructive flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                {t("problem")}
              </span>
            </div>
            <div className="px-6 py-4 bg-emerald-500/8 border-b border-border">
              <span className="text-sm font-semibold text-emerald-500 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10">
                  <CheckCircle className="h-3.5 w-3.5" />
                </span>
                {t("solution")}
              </span>
            </div>
          </div>
          {rows.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              className="grid grid-cols-2 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <div className="px-6 py-4 text-sm text-muted-foreground leading-relaxed">
                {row[0]}
              </div>
              <div className="px-6 py-4 text-sm text-foreground font-medium bg-emerald-500/[0.02] leading-relaxed">
                {row[1]}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          {rows.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm"
            >
              <div className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive/10 shrink-0 mt-0.5">
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                </span>
                {row[0]}
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-start gap-2.5 text-sm text-foreground font-medium leading-relaxed">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 shrink-0 mt-0.5">
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                </span>
                {row[1]}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
