import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function setupStickySteps(
  container: Element,
  stepSelector: string,
  onStepChange: (index: number) => void,
) {
  const steps = container.querySelectorAll(stepSelector);

  ScrollTrigger.create({
    trigger: container,
    start: "top top",
    end: `+=${steps.length * 100}%`,
    pin: true,
    scrub: 0.5,
    onUpdate: (self) => {
      const idx = Math.min(
        Math.floor(self.progress * steps.length),
        steps.length - 1,
      );
      onStepChange(idx);
    },
  });

  return () => {
    ScrollTrigger.getAll().forEach((st) => {
      if (st.trigger === container) st.kill();
    });
  };
}
