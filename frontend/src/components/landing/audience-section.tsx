"use client";

import { motion } from "framer-motion";
import { Factory, Palette, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

const ICONS = [Factory, Palette, TrendingUp];
const GRADIENTS = [
  "from-blue-500/10 to-indigo-500/5",
  "from-pink-500/10 to-rose-500/5",
  "from-emerald-500/10 to-teal-500/5",
];

export function AudienceSection() {
  const t = useTranslations("landing.audience");
  const cards = t.raw("cards") as { title: string; description: string }[];

  return (
    <section className="relative py-24 sm:py-32 bg-gradient-to-b from-background via-muted/30 to-background overflow-hidden">
      {/* Decorative orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[150px] -z-10" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold">{t("title")}</h2>
          <div className="mt-3 mx-auto h-1 w-12 rounded-full bg-primary/40" />
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {cards.map((card, i) => {
            const Icon = ICONS[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative rounded-2xl border border-border bg-card p-7 sm:p-8 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i]} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                />
                <div className="relative z-10">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-5 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
