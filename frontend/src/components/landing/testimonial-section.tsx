"use client";

import { motion } from "framer-motion";
import { Quote, Star, User } from "lucide-react";
import { useTranslations } from "next-intl";

export function TestimonialSection() {
  const t = useTranslations("landing.testimonial");

  const reviews = [0, 1, 2].map((i) => ({
    quote: t(`reviews.${i}.quote`),
    author: t(`reviews.${i}.author`),
    role: t(`reviews.${i}.role`),
  }));

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.02]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {t("title")}
          </h2>
          <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
          <div className="mt-4 mx-auto h-1 w-12 rounded-full bg-primary" />
        </motion.div>

        {/* Reviews grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.6,
                delay: i * 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 p-6 sm:p-8 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <Quote className="absolute top-5 right-5 h-8 w-8 text-primary/8" />

              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className="h-3.5 w-3.5 fill-primary/80 text-primary/80"
                  />
                ))}
              </div>

              <blockquote className="relative z-10 text-sm sm:text-[15px] text-foreground/90 leading-relaxed flex-1">
                &ldquo;{review.quote}&rdquo;
              </blockquote>

              <div className="mt-6 flex items-center gap-3 pt-5 border-t border-border/50">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/10">
                  <User className="h-4 w-4 text-primary/70" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {review.author}
                  </p>
                  <p className="text-xs text-muted-foreground">{review.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
