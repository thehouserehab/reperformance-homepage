"use client";

import type { MouseEvent, ReactNode } from "react";

type PeExamWindowLinkProps = {
  children: ReactNode;
  className?: string;
  href: string;
};

export default function PeExamWindowLink({ children, className, href }: PeExamWindowLinkProps) {
  function openPeExamWindow(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    const width = Math.min(1360, Math.max(1080, window.screen.availWidth - 96));
    const height = Math.min(920, Math.max(760, window.screen.availHeight - 96));
    const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
    const features = [
      "popup=yes",
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      "resizable=yes",
      "scrollbars=yes",
    ].join(",");

    const peExamWindow = window.open(href, "RePERFORMANCE_PE_EXAM", features);

    if (peExamWindow) {
      peExamWindow.opener = null;
      peExamWindow.focus();
      return;
    }

    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={openPeExamWindow}>
      {children}
    </a>
  );
}
