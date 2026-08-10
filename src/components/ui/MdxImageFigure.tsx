"use client";

import Image from "next/image";
import { useState } from "react";
const imageRegistry = {
  lipcodeResult: "/images/2026_lipcoding_result.png",
} as const;

type ImageKey = keyof typeof imageRegistry;

interface MdxImageFigureProps {
  src?: string;
  imageKey?: ImageKey;
  alt: string;
  priority?: boolean;
  maxWidth?: number;
  width?: number;
  height?: number;
}

export function MdxImageFigure({
  src,
  imageKey,
  alt,
  priority = false,
  maxWidth = 1200,
  width = 1200,
  height = 675,
}: MdxImageFigureProps) {
  const [loaded, setLoaded] = useState(false);
  const resolvedSrc = imageKey ? imageRegistry[imageKey] : src;

  const imageProps =
    typeof resolvedSrc === "string"
      ? { width, height }
      : {};

  if (!resolvedSrc) {
    return null;
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: `${maxWidth}px`,
        margin: "20px auto",
        borderRadius: "14px",
        overflow: "hidden",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--card-shadow)",
      }}
      className="progressive-image-frame"
      aria-busy={!loaded}
    >
      {!loaded && (
        <div className="image-loading-overlay" role="status">
          <span aria-hidden="true">{"{ image }"}</span>
          <small>이미지 불러오는 중</small>
        </div>
      )}
      <Image
        src={resolvedSrc}
        alt={alt}
        {...imageProps}
        style={{ width: "100%", height: "auto", display: "block" }}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
