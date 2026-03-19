"use client";

import { Button } from "@/components/ui/button";
import {
  PRICE_MONTHLY_FMT,
  PRICE_YEARLY_FMT,
  YEARLY_SAVING_FMT,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function PricingSection() {
  const t = useTranslations("landing.pricing");

  const rawPlans = t.raw("plans") as {
    name: string;
    price: string;
    period: string;
    description: string;
    badge: string;
    features: string[];
    cta: string;
  }[];

  const priceOverrides = ["0 ₸", PRICE_MONTHLY_FMT, PRICE_YEARLY_FMT];
  const plans = rawPlans.map((plan, i) => ({
    ...plan,
    price: priceOverrides[i] ?? plan.price,
    badge:
      i === 2 ? t("savingBadge", { amount: YEARLY_SAVING_FMT }) : plan.badge,
  }));

  return (
    <section id="pricing" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-muted/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/[0.04] rounded-full blur-[160px]" />
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold">{t("title")}</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
          <div className="mt-3 mx-auto h-1 w-12 rounded-full bg-primary/40" />
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((plan, i) => {
            const isPopular = i === 1;
            const isSaving = i === 2;
            const isHighlighted = isPopular || isSaving;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -8 }}
                className={cn(
                  "relative rounded-2xl border bg-card p-7 sm:p-8 transition-all duration-300",
                  isPopular &&
                    "border-primary shadow-2xl shadow-primary/15 scale-[1.02] md:scale-105 ring-1 ring-primary/10",
                  isSaving &&
                    "border-emerald-500/60 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/10",
                  !isHighlighted &&
                    "border-border shadow-sm hover:shadow-lg hover:border-primary/20",
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg whitespace-nowrap",
                        isPopular &&
                          "bg-primary text-primary-foreground shadow-primary/25",
                        isSaving &&
                          "bg-emerald-600 text-white shadow-emerald-600/25",
                      )}
                    >
                      {isPopular && <Star className="h-3 w-3 fill-current" />}
                      {isSaving && <TrendingDown className="h-3 w-3" />}
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  <div className="mt-5 mb-2">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground ml-1">
                        /{plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                {plan.features.length > 0 && (
                  <ul className="mt-7 space-y-3">
                    {plan.features.map((feature, j) => (
                      <li
                        key={j}
                        className="flex items-center gap-2.5 text-sm text-foreground"
                      >
                        <span
                          className={cn(
                            "flex items-center justify-center w-5 h-5 rounded-full shrink-0",
                            isSaving ? "bg-emerald-500/10" : "bg-primary/10",
                          )}
                        >
                          <Check
                            className={cn(
                              "h-3 w-3",
                              isSaving ? "text-emerald-600" : "text-primary",
                            )}
                          />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-8">
                  <Button
                    asChild
                    variant={isHighlighted ? "default" : "outline"}
                    className={cn(
                      "w-full h-11",
                      isPopular &&
                        "shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30",
                      isSaving &&
                        "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30",
                    )}
                  >
                    <Link href="/register">{plan.cta}</Link>
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
