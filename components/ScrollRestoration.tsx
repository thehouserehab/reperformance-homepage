"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function jumpToTop() {
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  // `html { scroll-behavior: smooth }` (globals.css) would otherwise turn
  // this reset into a slow animated scroll, and some mobile browsers handle
  // `scrollTo({ behavior: "instant" })` inconsistently — forcing "auto"
  // here guarantees an immediate jump everywhere.
  root.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  document.body.scrollTop = 0;
  root.style.scrollBehavior = previousBehavior;
}

/**
 * The bottom navigation swaps between top-level routes (student/coach/etc.
 * pages have no shared nested layout, so each tap is a real navigation).
 * Without this, the new screen can render at the previous screen's scroll
 * offset, so every route change here forces the viewport back to the top.
 */
export function ScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    jumpToTop();
    // On slower (mobile) hardware, images/fonts/hydration can still shift
    // layout right after this runs, and some mobile browsers can nudge the
    // scroll position while that happens — re-assert once more on the next
    // frame and once more shortly after so the reset actually sticks.
    const raf = requestAnimationFrame(jumpToTop);
    const timeout = window.setTimeout(jumpToTop, 80);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  return null;
}
