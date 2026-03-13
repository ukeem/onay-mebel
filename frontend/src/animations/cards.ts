import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function staggerCards(
  selector: string,
  trigger: string | Element,
  opts?: { stagger?: number; y?: number },
) {
  return gsap.from(selector, {
    y: opts?.y ?? 50,
    opacity: 0,
    duration: 0.7,
    stagger: opts?.stagger ?? 0.15,
    ease: "power3.out",
    scrollTrigger: {
      trigger,
      start: "top 80%",
      toggleActions: "play none none none",
    },
  });
}
