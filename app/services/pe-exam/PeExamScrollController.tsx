"use client";

import { useEffect } from "react";

const WHEEL_THRESHOLD = 28;
const TOUCH_THRESHOLD = 36;
const LOCK_MS = 620;

export default function PeExamScrollController() {
  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>("[data-pe-scroll]");
    if (!scroller) return;

    const panels = Array.from(scroller.querySelectorAll<HTMLElement>("[data-pe-panel]"));
    if (panels.length === 0) return;

    let locked = false;
    let touchStartY = 0;

    const getCurrentIndex = () => {
      const scrollTop = scroller.scrollTop;
      return panels.reduce((nearestIndex, panel, index) => {
        const currentDistance = Math.abs(panel.offsetTop - scrollTop);
        const nearestDistance = Math.abs(panels[nearestIndex].offsetTop - scrollTop);
        return currentDistance < nearestDistance ? index : nearestIndex;
      }, 0);
    };

    const move = (direction: 1 | -1) => {
      if (locked) return;
      const currentIndex = getCurrentIndex();
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), panels.length - 1);
      if (nextIndex === currentIndex) return;

      locked = true;
      panels[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        locked = false;
      }, LOCK_MS);
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;
      event.preventDefault();
      move(event.deltaY > 0 ? 1 : -1);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY ?? touchStartY;
      const delta = touchStartY - currentY;
      if (Math.abs(delta) < TOUCH_THRESHOLD) return;
      event.preventDefault();
      move(delta > 0 ? 1 : -1);
      touchStartY = currentY;
    };

    scroller.addEventListener("wheel", onWheel, { passive: false });
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return null;
}
