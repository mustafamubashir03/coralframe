"use client";

import { ReactNode, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * One orchestrated entrance for the brand rail: headline, subline and the
 * capability rows rise and fade in a single staggered choreography.
 * Runs once per mount; skipped entirely under reduced motion.
 */
export function RailEntrance({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        scope.current?.querySelectorAll("[data-rail-rise]") ?? [],
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: "expo.out",
          stagger: 0.09,
          delay: 0.1,
          clearProps: "transform,opacity",
        }
      );
    },
    { scope }
  );

  return <div ref={scope}>{children}</div>;
}
