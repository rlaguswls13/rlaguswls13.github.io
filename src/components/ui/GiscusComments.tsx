"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingPlaceholder } from "@/components/ui/DeferredContent";
import type { GiscusInfo } from "@/lib/giscus-info";

function getThemeUrl(theme: "light" | "dark") {
  const devlogPathIndex = window.location.pathname.indexOf("/devlog/");
  const basePath = devlogPathIndex > 0
    ? window.location.pathname.slice(0, devlogPathIndex)
    : "";

  const themeUrl = new URL(`${basePath}/giscus-themes/${theme}.css`, window.location.origin);
  themeUrl.searchParams.set("v", "20260721-3");
  return themeUrl.href;
}

function getCurrentTheme() {
  return document.documentElement.classList.contains("theme-dark") ? "dark" : "light";
}

function getCurrentGiscusTheme() {
  return getThemeUrl(getCurrentTheme());
}

export function GiscusComments({ config, term }: { config: GiscusInfo["giscus"]; term?: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || shouldLoad) return;

    let idleId: number | undefined;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => setShouldLoad(true), { timeout: 1200 });
      } else {
        timerId = setTimeout(() => setShouldLoad(true), 1);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        schedule();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      if (idleId !== undefined && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      if (timerId !== undefined) clearTimeout(timerId);
    };
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;
    const container = containerRef.current;
    if (!container) return;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", config.repository);
    script.setAttribute("data-repo-id", config.repositoryId);
    script.setAttribute("data-category", config.category);
    script.setAttribute("data-category-id", config.categoryId);
    script.setAttribute("data-mapping", term ? "specific" : "pathname");
    if (term) script.setAttribute("data-term", term);
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "0");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "bottom");
    script.setAttribute("data-theme", getCurrentGiscusTheme());
    script.setAttribute("data-lang", config.language);
    container.appendChild(script);

    const syncTheme = () => {
      const theme = getCurrentGiscusTheme();
      const frame = container.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
      if (frame) frame.style.colorScheme = getCurrentTheme();
      frame?.contentWindow?.postMessage({ giscus: { setConfig: { theme } } }, "https://giscus.app");
    };

    let currentFrame: HTMLIFrameElement | null = null;
    const bindFrameLoad = () => {
      const nextFrame = container.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
      if (nextFrame === currentFrame) return;
      currentFrame?.removeEventListener("load", syncTheme);
      currentFrame = nextFrame;
      currentFrame?.addEventListener("load", syncTheme);
    };

    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const frameObserver = new MutationObserver(bindFrameLoad);
    frameObserver.observe(container, { childList: true, subtree: true });

    return () => {
      themeObserver.disconnect();
      frameObserver.disconnect();
      currentFrame?.removeEventListener("load", syncTheme);
      container.replaceChildren();
    };
  }, [config, shouldLoad, term]);

  return (
    <section ref={sectionRef} className="comments-section render-lazy" aria-labelledby="comments-title">
      <div className="comments-heading">
        <span className="page-heading-eyebrow">DISCUSSION</span>
        <h2 id="comments-title">댓글</h2>
        <p>GitHub 계정으로 의견이나 질문을 남길 수 있습니다.</p>
      </div>
      <div ref={containerRef} className="giscus-container" aria-busy={!shouldLoad}>
        {!shouldLoad && <LoadingPlaceholder label="댓글 불러오는 중" minHeight={220} />}
      </div>
    </section>
  );
}
