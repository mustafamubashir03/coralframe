"use client";

import * as React from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

export function StatValue({
  value,
  index = 0,
  className,
}: {
  value: number;
  index?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.textContent = String(value);
        return;
      }
      const counter = { n: 0 };
      gsap.to(counter, {
        n: value,
        duration: 0.9,
        delay: 0.06 * index,
        ease: "expo.out",
        snap: { n: 1 },
        onUpdate: () => {
          el.textContent = String(Math.round(counter.n));
        },
      });
    },
    { dependencies: [value, index] }
  );

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      0
    </span>
  );
}
