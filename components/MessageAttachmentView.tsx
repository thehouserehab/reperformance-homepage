"use client";

import { useEffect, useState } from "react";
import { FileWarning, Film, ImageIcon } from "lucide-react";
import { formatAttachmentSize, loadVerifiedMessageAttachment } from "@/lib/messageAttachments";
import type { CoachConversationAttachment } from "@/lib/types";

export function MessageAttachmentView({ attachment }: { attachment: CoachConversationAttachment }) {
  const [mediaUrl, setMediaUrl] = useState("");
  const [failure, setFailure] = useState<"missing" | "invalid" | "load" | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    loadVerifiedMessageAttachment(attachment)
      .then((result) => {
        if (!active) return;
        if (result.status !== "ready") {
          setFailure(result.status);
          return;
        }
        objectUrl = URL.createObjectURL(result.blob);
        setMediaUrl(objectUrl);
      })
      .catch(() => {
        if (active) setFailure("load");
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.byteSize, attachment.kind, attachment.mimeType, attachment.storageKey]);

  if (failure) {
    return (
      <div className="message-media-fallback" title={attachment.fileName}>
        <FileWarning aria-hidden="true" size={20} />
        <span>
          {failure === "invalid"
            ? "파일 정보가 일치하지 않아 표시하지 않았습니다."
            : "파일을 불러올 수 없습니다."}
        </span>
      </div>
    );
  }

  if (!mediaUrl) {
    return (
      <div className="message-media-loading" aria-label={`${attachment.fileName} 불러오는 중`}>
        {attachment.kind === "image" ? (
          <ImageIcon aria-hidden="true" size={20} />
        ) : (
          <Film aria-hidden="true" size={20} />
        )}
      </div>
    );
  }

  return (
    <figure className="message-media-item">
      {attachment.kind === "image" ? (
        <a href={mediaUrl} target="_blank" rel="noreferrer" aria-label={`${attachment.fileName} 크게 보기`}>
          {/* Blob URLs are local, authenticated-session media and cannot use next/image optimization. */}
          <img src={mediaUrl} alt={attachment.fileName} />
        </a>
      ) : (
        <video src={mediaUrl} controls preload="metadata" playsInline aria-label={attachment.fileName} />
      )}
      <figcaption>
        <span>{attachment.fileName}</span>
        <small>{formatAttachmentSize(attachment.byteSize)}</small>
      </figcaption>
    </figure>
  );
}
