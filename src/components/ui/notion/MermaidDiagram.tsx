"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

// Mermaid computes derived shades (hover/border tints) with its own color
// parser, which only understands hex/rgb()/hsl()/named colors - not a raw
// `var(...)` reference, this codebase's `color-mix(...)` theme tokens, or
// the `color(srgb ...)` form Chrome's computed style can report for those.
// A 1x1 canvas always normalizes whatever the browser accepts as a fill
// color down to plain 8-bit rgb(), regardless of which of those forms the
// custom property resolves to.
function resolveColor(name: string, fallback: string): string {
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  if (!computed) return fallback;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallback;
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a === 0 ? fallback : `rgb(${r}, ${g}, ${b})`;
}

function themeVariables() {
  return {
    fontFamily: "inherit",
    background: resolveColor("--bg-tertiary", "#ffffff"),
    mainBkg: resolveColor("--bg-secondary", "#ffffff"),
    primaryColor: resolveColor("--bg-secondary", "#ffffff"),
    primaryTextColor: resolveColor("--text-primary", "#111111"),
    primaryBorderColor: resolveColor("--accent-primary", "#4472d8"),
    secondaryColor: resolveColor("--bg-primary", "#ffffff"),
    tertiaryColor: resolveColor("--bg-primary", "#ffffff"),
    lineColor: resolveColor("--border-color", "#cccccc"),
    textColor: resolveColor("--text-primary", "#111111"),
    nodeTextColor: resolveColor("--text-primary", "#111111"),
    nodeBorder: resolveColor("--accent-primary", "#4472d8"),
    clusterBkg: resolveColor("--bg-tertiary", "#ffffff"),
    clusterBorder: resolveColor("--border-color", "#cccccc"),
    edgeLabelBackground: resolveColor("--bg-primary", "#ffffff"),
    titleColor: resolveColor("--text-primary", "#111111"),
  };
}

function childrenToText(children: ReactNode): string {
  if (Array.isArray(children)) return children.map(childrenToText).join("");
  if (children == null || typeof children === "boolean") return "";
  return String(children);
}

export function MermaidDiagram({ children }: { children?: ReactNode }) {
  const code = childrenToText(children).trim();
  const containerRef = useRef<HTMLDivElement>(null);
  const renderId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [error, setError] = useState<string | null>(null);
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((tick) => tick + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!code) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: themeVariables(),
        });
        const { svg } = await mermaid.render(`mermaid-${renderId}-${themeTick}`, code);
        if (!cancelled && containerRef.current) containerRef.current.innerHTML = svg;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, renderId, themeTick]);

  if (!code) return null;

  if (error) {
    return (
      <div className="my-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4 text-sm text-[var(--text-secondary)]">
        <p className="mb-2 font-semibold">Mermaid 다이어그램을 그릴 수 없습니다.</p>
        <pre className="overflow-x-auto whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  return (
    <div className="mermaid-diagram my-4 flex justify-center overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4">
      <div ref={containerRef} />
    </div>
  );
}
