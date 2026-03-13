import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function q(container: Element, selector: string) {
  return container.querySelector(selector);
}

export function heroTimeline(container: Element) {
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  const title = q(container, ".hero-title");
  const subtitle = q(container, ".hero-subtitle");
  const ctas = container.querySelectorAll(".hero-cta");
  const microcopy = q(container, ".hero-microcopy");
  const scene = q(container, ".hero-3d");

  if (title) tl.from(title, { y: 80, opacity: 0, duration: 1 });
  if (subtitle)
    tl.from(subtitle, { y: 40, opacity: 0, duration: 0.8 }, "-=0.5");
  if (ctas.length)
    tl.from(ctas, { y: 30, opacity: 0, duration: 0.6, stagger: 0.15 }, "-=0.4");
  if (microcopy)
    tl.from(microcopy, { y: 20, opacity: 0, duration: 0.5 }, "-=0.3");
  if (scene)
    tl.from(
      scene,
      { scale: 0.9, opacity: 0, duration: 1.2, ease: "power2.out" },
      "-=0.8",
    );

  /* Parallax на фоновых orb-ах при скролле */
  const orb1 = q(container, ".hero-parallax-orb");
  const orb2 = q(container, ".hero-parallax-orb-2");

  if (orb1) {
    gsap.to(orb1, {
      y: -120,
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "bottom top",
        scrub: 1,
      },
    });
  }
  if (orb2) {
    gsap.to(orb2, {
      y: -80,
      x: 40,
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "bottom top",
        scrub: 1,
      },
    });
  }

  return tl;
}
