"use client";

import { useEffect, useRef } from "react";

export function HeroPerspective({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // All animation state lives in refs and is written straight to the DOM — no
  // React re-renders on scroll/mousemove. Reads + the single style write are
  // coalesced to one per frame via requestAnimationFrame so getBoundingClientRect
  // (a forced reflow) happens at most once per frame.
  const hoveringRef = useRef(false);
  const lastClientRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const apply = () => {
      rafRef.current = null;
      const rect = outer.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when element top is at viewport bottom, 1 when it's scrolled well into view
      const progress = Math.min(1, Math.max(0, 1 - rect.top / vh));

      const hovering = hoveringRef.current;
      let mx = 0;
      let my = 0;
      if (hovering && lastClientRef.current) {
        mx = ((lastClientRef.current.x - rect.left) / rect.width - 0.5) * 2;
        my = ((lastClientRef.current.y - rect.top) / rect.height - 0.5) * 2;
      }

      // rotateX goes from 12deg (tilted back) to 0deg (flat)
      const baseRotateX = 12 * (1 - progress);
      const rotateX = hovering ? baseRotateX - my * 3 : baseRotateX;
      const rotateY = hovering ? mx * 5 : 0;
      const scale = (0.96 + 0.04 * progress) * (hovering ? 1.01 : 1);

      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(apply);
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastClientRef.current = { x: e.clientX, y: e.clientY };
      schedule();
    };
    const handleMouseEnter = () => {
      hoveringRef.current = true;
      schedule();
    };
    const handleMouseLeave = () => {
      hoveringRef.current = false;
      lastClientRef.current = null;
      schedule();
    };

    apply();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    outer.addEventListener("mousemove", handleMouseMove);
    outer.addEventListener("mouseenter", handleMouseEnter);
    outer.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      outer.removeEventListener("mousemove", handleMouseMove);
      outer.removeEventListener("mouseenter", handleMouseEnter);
      outer.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div ref={outerRef} className="group perspective-distant md:perspective-[2000px]">
      <div
        ref={innerRef}
        className="transition-transform duration-300 ease-out"
        style={{ transform: "rotateX(12deg) scale(0.96)", transformOrigin: "center center" }}
      >
        {children}
      </div>
    </div>
  );
}
