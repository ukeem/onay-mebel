import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function fadeInUp(
  selector: string | Element,
  trigger?: string | Element,
  opts?: { delay?: number; duration?: number; y?: number; start?: string },
) {
  return gsap.from(selector, {
    y: opts?.y ?? 60,
    opacity: 0,
    duration: opts?.duration ?? 0.8,
    delay: opts?.delay ?? 0,
    ease: "power3.out",
    scrollTrigger: {
      trigger: trigger ?? (selector as Element),
      start: opts?.start ?? "top 85%",
      toggleActions: "play none none none",
    },
  });
}

export function staggerReveal(
  selector: string,
  trigger: string | Element,
  opts?: { stagger?: number; duration?: number; y?: number; start?: string },
) {
  return gsap.from(selector, {
    y: opts?.y ?? 40,
    opacity: 0,
    duration: opts?.duration ?? 0.6,
    stagger: opts?.stagger ?? 0.15,
    ease: "power3.out",
    scrollTrigger: {
      trigger,
      start: opts?.start ?? "top 80%",
      toggleActions: "play none none none",
    },
  });
}

export function highlightRows(
  selector: string,
  trigger: string | Element,
  opts?: { stagger?: number },
) {
  return gsap.from(selector, {
    x: -30,
    opacity: 0,
    duration: 0.5,
    stagger: opts?.stagger ?? 0.12,
    ease: "power2.out",
    scrollTrigger: {
      trigger,
      start: "top 80%",
      toggleActions: "play none none none",
    },
  });
}

export { gsap, ScrollTrigger };
