"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle2, CreditCard, Send } from "lucide-react";
import { useTranslations } from "next-intl";

export function PaymentSection() {
  const t = useTranslations("landing.payment");

  const steps = t.raw("steps") as string[];

  return (
    <section className="relative py-24 sm:py-28 bg-gradient-to-b from-muted/20 to-muted/30 overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[300px] bg-primary/[0.02] rounded-full blur-[100px] -z-10" />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" />
          <h2 className="text-3xl sm:text-4xl font-bold">{t("title")}</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* Steps with progress line */}
        <div className="relative max-w-2xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-5 bottom-5 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

          <div className="space-y-4">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                className="relative flex items-center gap-4 group"
              >
                <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 border-primary/30 bg-background text-primary text-sm font-bold shrink-0 transition-transform group-hover:scale-110 group-hover:border-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="rounded-xl bg-card border border-border px-5 py-3.5 transition-colors group-hover:border-primary/20">
                    <p className="text-sm text-foreground leading-relaxed">
                      {step}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center text-sm text-muted-foreground mt-10"
        >
          {t("note")}
        </motion.p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button
            size="lg"
            className="h-12 gap-2 shadow-md shadow-primary/20"
            disabled
          >
            <CreditCard className="h-4 w-4" />
            {t("ctaPay")}
          </Button>
          <Button variant="outline" size="lg" className="h-12 gap-2" disabled>
            <Send className="h-4 w-4" />
            {t("ctaReceipt")}
          </Button>
        </div>
      </div>
    </section>
  );
}
