"use client";

import Image from "next/image";
import { useState } from "react";

export function NotionImage({ src, caption }: { src: string; caption?: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  if (!src) return null;

  return (
    <figure className="my-8 flex flex-col items-center justify-center render-lazy">
      <div
        className="progressive-image-frame relative w-full max-w-4xl rounded-lg overflow-hidden flex justify-center"
        aria-busy={status === "loading"}
      >
        {status !== "loaded" && (
          <div className="image-loading-overlay" role="status">
            <span aria-hidden="true">{"{ image }"}</span>
            <small>{status === "error" ? "이미지를 표시할 수 없습니다" : "이미지 불러오는 중"}</small>
          </div>
        )}
        <Image
          src={src}
          alt={caption || "Notion Image"}
          width={1200}
          height={800}
          unoptimized
          className="w-auto h-auto max-h-[70vh] object-contain rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]"
          loading="lazy"
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      </div>
      {caption && caption !== "image" && (
        <figcaption className="mt-3 text-sm text-[var(--text-secondary)] text-center font-medium">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
