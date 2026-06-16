"use client";

import { useEffect } from "react";

const TRIGGER_RATIO = 0.09;
const MIN_TRIGGER = 42;
const MAX_TRIGGER = 82;
const LOCK_MS = 580;
const RESET_MS = 180;

function normalizeWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 18;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

export default function PeExamScrollController() {
  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>("[data-pe-scroll]");
    if (!scroller) return;

    const panels = Array.from(scroller.querySelectorAll<HTMLElement>("[data-pe-panel]"));
    if (panels.length === 0) return;

    let locked = false;
    let wheelDelta = 0;
    let wheelResetTimer: number | undefined;
    let touchStartY = 0;
    let touchDelta = 0;

    const getCurrentIndex = () => {
      const scrollTop = scroller.scrollTop;
      return panels.reduce((nearestIndex, panel, index) => {
        const currentDistance = Math.abs(panel.offsetTop - scrollTop);
        const nearestDistance = Math.abs(panels[nearestIndex].offsetTop - scrollTop);
        return currentDistance < nearestDistance ? index : nearestIndex;
      }, 0);
    };

    const getTriggerDistance = () => Math.min(Math.max(scroller.clientHeight * TRIGGER_RATIO, MIN_TRIGGER), MAX_TRIGGER);

    const move = (direction: 1 | -1) => {
      if (locked) return;
      const currentIndex = getCurrentIndex();
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), panels.length - 1);
      if (nextIndex === currentIndex) return;

      locked = true;
      wheelDelta = 0;
      touchDelta = 0;
      panels[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        locked = false;
      }, LOCK_MS);
    };

    const onWheel = (event: WheelEvent) => {
      const target = event.target as Node | null;
      if (target && !scroller.contains(target)) return;

      event.preventDefault();
      if (locked) return;

      wheelDelta += normalizeWheelDelta(event);
      window.clearTimeout(wheelResetTimer);
      wheelResetTimer = window.setTimeout(() => {
        wheelDelta = 0;
      }, RESET_MS);

      if (Math.abs(wheelDelta) >= getTriggerDistance()) {
        move(wheelDelta > 0 ? 1 : -1);
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      const target = event.target as Node | null;
      if (target && !scroller.contains(target)) return;
      touchStartY = event.touches[0]?.clientY ?? 0;
      touchDelta = 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      const target = event.target as Node | null;
      if (target && !scroller.contains(target)) return;

      const currentY = event.touches[0]?.clientY ?? touchStartY;
      const delta = touchStartY - currentY;
      event.preventDefault();
      if (locked) return;

      touchDelta += delta;
      touchStartY = currentY;
      if (Math.abs(touchDelta) >= getTriggerDistance()) {
        move(touchDelta > 0 ? 1 : -1);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const keys: Record<string, 1 | -1 | undefined> = {
        ArrowDown: 1,
        PageDown: 1,
        Space: 1,
        ArrowUp: -1,
        PageUp: -1,
      };
      const direction = keys[event.code] ?? keys[event.key];
      if (!direction) return;
      event.preventDefault();
      move(direction);
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(wheelResetTimer);
      window.removeEventListener("wheel", onWheel, { capture: true });
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
