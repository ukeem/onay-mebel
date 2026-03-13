"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Simulate loading progress with acceleration
    let frame: number;
    let current = 0;

    const tick = () => {
      // Slow and dramatic: crawl to 60, pause around 70-90, then finish
      const speed =
        current < 30 ? 0.6 : current < 60 ? 0.4 : current < 90 ? 0.25 : 1.5;
      current = Math.min(100, current + speed);
      setProgress(Math.round(current));

      if (current < 100) {
        frame = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setDone(true), 600);
      }
    };

    // Initial delay before starting
    const timeout = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, 500);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Background grid */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
            {/* Animated glow orbs */}
            <motion.div
              className="absolute top-1/3 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px]"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-primary/15 blur-[100px]"
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <div className="relative flex flex-col items-center gap-8">
            {/* Logo / Brand Mark */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative"
            >
              <div className="relative flex h-20 w-20 items-center justify-center">
                {/* Spinning ring */}
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-primary/30"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ borderRadius: "28%" }}
                />
                {/* Counter-spinning ring */}
                <motion.div
                  className="absolute inset-1 rounded-2xl border-2 border-transparent border-t-primary border-b-primary"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ borderRadius: "32%" }}
                />
                {/* Center text */}
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  O
                </span>
              </div>
            </motion.div>

            {/* Brand name with stagger */}
            <motion.div className="flex gap-[2px]">
              {"ONAY MEBEL".split("").map((char, i) => (
                <motion.span
                  key={i}
                  className="text-lg font-semibold tracking-[0.2em] text-foreground/80"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.3 + i * 0.05,
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {char === " " ? "\u00A0\u00A0" : char}
                </motion.span>
              ))}
            </motion.div>

            {/* Progress bar */}
            <motion.div
              className="relative h-[2px] w-48 overflow-hidden rounded-full bg-muted"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/60 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: [-80, 200] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.div>

            {/* Percentage */}
            <motion.span
              className="text-xs tabular-nums text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {progress}%
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
