// Local outlined-illustration thumbnail renderer.
//
// Fallback for the `imagegen` skill (not installed). Builds one centred scene
// per topic as SVG and rasterises it to a 576x384 RGB WebP with `sharp`,
// following `.wiki/pipeline/thumbnail-rules.md` and matching the hand-made
// baseline set: navy-outlined icon objects on white / two-blue fills, dashed
// connectors with node dots, a light square-grid background, one subject
// centred in the middle ~70%, and no text / logos / watermarks.
//
// Usage:
//   node scripts/thumbnail/generate-thumbnails.mjs                 # every mapped id (placeholders only)
//   node scripts/thumbnail/generate-thumbnails.mjs --force         # overwrite non-placeholder files too
//   node scripts/thumbnail/generate-thumbnails.mjs --only <id,id>  # a subset
//   node scripts/thumbnail/generate-thumbnails.mjs --out <dir>     # render to a preview dir instead

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { requiredThumbnailPath } from "./thumbnail-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const W = 576;
const H = 384;
const CX = 288;
const CY = 190;

const C = {
  bg: "#eef3fb",
  grid: "#dde7f5",
  ink: "#1e2a4f", // navy outline + darkest fill
  blue: "#3f74c9", // primary mid-blue fill
  sky: "#a9c6f2", // light-blue accent fill
  wash: "#dce7f8", // pale fill
  white: "#ffffff",
};
const SW = 2.4; // base stroke width (scaled up at render time)

// ---------------------------------------------------------------------------
// low-level svg
// ---------------------------------------------------------------------------
const attr = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
const G = (inner, tx = 0, ty = 0, rot) =>
  `<g transform="translate(${r2(tx)} ${r2(ty)})${rot ? ` rotate(${rot})` : ""}">${inner}</g>`;
const r2 = (n) => (typeof n === "number" ? Math.round(n * 100) / 100 : n);

// outlined primitives — stroke defaults to navy
const box = (x, y, w, h, o = {}) =>
  `<rect ${attr({
    x: r2(x), y: r2(y), width: r2(w), height: r2(h),
    rx: o.rx ?? 6, fill: o.fill ?? C.white,
    stroke: o.stroke ?? C.ink, "stroke-width": o.sw ?? SW,
    "stroke-dasharray": o.dash, opacity: o.opacity,
  })}/>`;
const dot = (cx, cy, r, o = {}) =>
  `<circle ${attr({
    cx: r2(cx), cy: r2(cy), r,
    fill: o.fill ?? C.ink, stroke: o.stroke, "stroke-width": o.stroke ? (o.sw ?? SW) : undefined,
    opacity: o.opacity,
  })}/>`;
const ring = (cx, cy, r, o = {}) =>
  `<circle ${attr({ cx: r2(cx), cy: r2(cy), r, fill: o.fill ?? "none", stroke: o.stroke ?? C.ink, "stroke-width": o.sw ?? SW, "stroke-dasharray": o.dash })}/>`;
const seg = (x1, y1, x2, y2, o = {}) =>
  `<line ${attr({
    x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2),
    stroke: o.stroke ?? C.ink, "stroke-width": o.sw ?? SW,
    "stroke-linecap": "round", "stroke-dasharray": o.dash,
  })}/>`;
const poly = (pts, o = {}) =>
  `<polygon ${attr({ points: pts.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" "), fill: o.fill ?? C.white, stroke: o.stroke ?? C.ink, "stroke-width": o.sw ?? SW, "stroke-linejoin": "round", opacity: o.opacity })}/>`;
const P = (d, o = {}) =>
  `<path ${attr({ d, fill: o.fill ?? "none", stroke: o.stroke ?? C.ink, "stroke-width": o.sw ?? SW, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": o.dash })}/>`;

// arrows -------------------------------------------------------------------
function arrowHead(x, y, ang, size = 9, fill = C.ink) {
  const a1 = ang + Math.PI - 0.44;
  const a2 = ang + Math.PI + 0.44;
  return poly(
    [
      [x, y],
      [x + size * Math.cos(a1), y + size * Math.sin(a1)],
      [x + size * Math.cos(a2), y + size * Math.sin(a2)],
    ],
    { fill, stroke: fill, sw: 1 },
  );
}
const arrow = (x1, y1, x2, y2, o = {}) => {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const st = o.stroke ?? C.ink;
  return seg(x1, y1, x2 - 6 * Math.cos(ang), y2 - 6 * Math.sin(ang), { stroke: st, sw: o.sw ?? SW + 0.4 }) + arrowHead(x2, y2, ang, o.size ?? 9, st);
};
// dashed connector with a mid node dot (baseline signature)
const link = (x1, y1, x2, y2, o = {}) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    seg(x1, y1, x2, y2, { stroke: o.stroke ?? C.ink, sw: o.sw ?? SW, dash: o.dash ?? "0.1 6" }) +
    dot(mx, my, o.node ?? 3.4, { fill: o.nodeFill ?? C.blue, stroke: C.ink, sw: 1.4 }) +
    (o.arrow ? arrowHead(x2, y2, Math.atan2(y2 - y1, x2 - x1), 8) : "")
  );
};
const curveArrow = (x1, y1, x2, y2, bend = 40, o = {}) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - bend;
  const ang = Math.atan2(y2 - my, x2 - mx);
  return P(`M ${r2(x1)} ${r2(y1)} Q ${r2(mx)} ${r2(my)} ${r2(x2 - 5 * Math.cos(ang))} ${r2(y2 - 5 * Math.sin(ang))}`, { stroke: o.stroke ?? C.ink, sw: o.sw ?? SW }) + arrowHead(x2, y2, ang, 8, o.stroke ?? C.ink);
};

// ---------------------------------------------------------------------------
// icon library — each authored around its own local origin, ~64-120px
// ---------------------------------------------------------------------------
const I = {
  // document / note with folded corner and text lines
  doc(w = 46, h = 58, fill = C.white) {
    const fold = 12;
    const d = `M 0 0 H ${w - fold} L ${w} ${fold} V ${h} H 0 Z`;
    let lines = "";
    for (let i = 0; i < 3; i += 1) lines += seg(9, 20 + i * 10, w - 10 - (i === 2 ? 8 : 0), 20 + i * 10, { stroke: C.blue, sw: SW });
    return P(d, { fill }) + P(`M ${w - fold} 0 V ${fold} H ${w}`, {}) + lines;
  },
  // gear
  gear(r = 15, fill = C.sky) {
    const pts = [];
    const teeth = 8;
    for (let i = 0; i < teeth * 2; i += 1) {
      const a = (i * Math.PI) / teeth;
      const rr = i % 2 === 0 ? r + 5 : r;
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      const a2 = ((i + 0.5) * Math.PI) / teeth;
      const rr2 = i % 2 === 0 ? r + 5 : r;
      pts.push([Math.cos(a2) * rr2, Math.sin(a2) * rr2]);
    }
    return poly(pts, { fill }) + dot(0, 0, r * 0.36, { fill: C.white, stroke: C.ink, sw: SW });
  },
  // magnifier
  lens(r = 15) {
    return ring(0, 0, r, { fill: C.wash, sw: SW }) + seg(r * 0.7, r * 0.7, r * 0.7 + 12, r * 0.7 + 12, { sw: SW + 2 });
  },
  // robot head
  robot(w = 44, h = 40) {
    return (
      seg(w / 2, -10, w / 2, 0, { sw: SW }) + dot(w / 2, -12, 3.2, { fill: C.blue, stroke: C.ink, sw: 1.4 }) +
      box(0, 0, w, h, { rx: 10, fill: C.blue }) +
      dot(w * 0.32, h * 0.5, 4.4, { fill: C.white }) + dot(w * 0.68, h * 0.5, 4.4, { fill: C.white }) +
      seg(w * 0.3, h * 0.78, w * 0.7, h * 0.78, { stroke: C.white, sw: SW })
    );
  },
  // server rack (slots)
  server(w = 60, h = 92) {
    let slots = box(0, 0, w, h, { rx: 8, fill: C.blue });
    for (let i = 0; i < 4; i += 1) {
      slots += box(7, 9 + i * 20, w - 14, 13, { rx: 3, fill: C.white, sw: SW * 0.9 });
      slots += dot(w - 15, 15.5 + i * 20, 2, { fill: C.blue });
    }
    return slots;
  },
  // terminal / console panel with coloured "log line" dots
  terminal(w = 150, h = 92) {
    let s = box(0, 0, w, h, { rx: 10, fill: C.ink });
    for (let r = 0; r < 4; r += 1) {
      let x = 12;
      const segsN = 3 + ((r * 2) % 3);
      for (let i = 0; i < segsN; i += 1) {
        const len = 12 + ((i * 7 + r * 5) % 22);
        s += `<rect ${attr({ x: r2(x), y: r2(14 + r * 18), width: len, height: 6, rx: 3, fill: i === 0 ? C.blue : C.sky, opacity: 0.9 })}/>`;
        x += len + 8;
        if (x > w - 26) break;
      }
      s += dot(w - 14, 17 + r * 18, 2.6, { fill: C.blue });
    }
    return s;
  },
  // database cylinder
  cylinder(rx = 26, h = 46, fill = C.sky) {
    const ry = rx * 0.36;
    return (
      P(`M ${-rx} ${-h / 2} a ${rx} ${ry} 0 0 0 ${rx * 2} 0 l 0 ${h} a ${rx} ${ry} 0 0 1 ${-rx * 2} 0 Z`, { fill }) +
      `<ellipse ${attr({ cx: 0, cy: -h / 2, rx, ry, fill: C.white, stroke: C.ink, "stroke-width": SW })}/>` +
      P(`M ${-rx} ${-h / 2 + h * 0.42} a ${rx} ${ry} 0 0 0 ${rx * 2} 0`, {})
    );
  },
  // isometric cube
  cube(s = 34, fill = C.blue) {
    const top = [[0, -s * 0.5], [s, 0], [0, s * 0.5], [-s, 0]];
    const left = [[-s, 0], [0, s * 0.5], [0, s * 1.5], [-s, s]];
    const right = [[s, 0], [0, s * 0.5], [0, s * 1.5], [s, s]];
    return poly(left, { fill: C.ink }) + poly(right, { fill }) + poly(top, { fill: C.sky });
  },
  // shield with inner cube badge
  shield(w = 76, h = 92) {
    const d = `M 0 ${-h / 2} L ${w / 2} ${-h / 2 + 12} V 8 Q ${w / 2} ${h / 2} 0 ${h / 2} Q ${-w / 2} ${h / 2} ${-w / 2} 8 V ${-h / 2 + 12} Z`;
    return P(d, { fill: C.blue }) + P(d.replace(/([\d.-]+)/g, (m) => String(Number(m) * 0.7)), { fill: C.white, sw: SW }) + G(I.cube(13, C.sky), 0, -8);
  },
  // chart inside a rounded "figure" frame
  chartFrame(w = 150, h = 112, kind = "line") {
    let inner = "";
    const px = 18;
    const py = 14;
    const iw = w - px - 12;
    const ih = h - py - 18;
    inner += seg(px, py, px, py + ih, { sw: SW }) + seg(px, py + ih, px + iw, py + ih, { sw: SW });
    if (kind === "line") inner += smooth(px, py + ih, iw, [0.2, 0.6, 0.38, 0.82, 0.6], ih * 0.9, C.blue);
    if (kind === "bars") inner += [0.4, 0.75, 0.55, 0.9].map((v, i) => box(px + 8 + i * (iw / 5), py + ih - v * ih * 0.85, iw / 8, v * ih * 0.85, { fill: C.sky, rx: 2 })).join("");
    if (kind === "scatter") inner += [[0.15, 0.7], [0.35, 0.5], [0.5, 0.62], [0.68, 0.32], [0.85, 0.4]].map(([a, b]) => dot(px + a * iw, py + b * ih, 3.6, { fill: C.blue })).join("") + seg(px + 6, py + ih - 8, px + iw - 6, py + 12, { stroke: C.ink, sw: SW });
    return box(0, 0, w, h, { rx: 12, fill: C.white }) + inner;
  },
  // a data panel: outlined grid of cells
  panel(cols, rows, cell = 20, o = {}) {
    const gap = 4;
    const w = cols * cell + (cols - 1) * gap + 12;
    const h = rows * cell + (rows - 1) * gap + 12;
    let s = box(0, 0, w, h, { rx: 8, fill: C.white });
    for (let r = 0; r < rows; r += 1)
      for (let c = 0; c < cols; c += 1) {
        const f = o.fill ? o.fill(c, r) : ((c + r) % 2 ? C.sky : C.wash);
        if (f === null) {
          s += box(6 + c * (cell + gap), 6 + r * (cell + gap), cell, cell, { rx: 3, fill: "none", dash: "3 3", sw: SW * 0.8 });
        } else {
          s += box(6 + c * (cell + gap), 6 + r * (cell + gap), cell, cell, { rx: 3, fill: f, sw: SW * 0.7 });
        }
      }
    return { markup: s, w, h };
  },
  // a table icon: navy header bar + body rows, first column tinted
  table(cols = 4, rows = 4, o = {}) {
    const cw = 30;
    const ch = 17;
    const w = cols * cw + 8;
    const headH = 14;
    let s = box(0, 0, w, headH + rows * ch + 10, { rx: 8, fill: C.white });
    s += box(4, 4, w - 8, headH, { rx: 3, fill: C.ink });
    for (let r = 0; r < rows; r += 1)
      for (let c = 0; c < cols; c += 1) {
        const f = o.fill ? o.fill(c, r) : (c === 0 ? C.sky : C.wash);
        if (f === null) s += box(4 + c * cw, headH + 6 + r * ch, cw - 3, ch - 3, { rx: 2, fill: "none", dash: "3 3", sw: SW * 0.8 });
        else s += box(4 + c * cw, headH + 6 + r * ch, cw - 3, ch - 3, { rx: 2, fill: f, sw: SW * 0.6 });
      }
    return { markup: s, w, h: headH + rows * ch + 10 };
  },
  // small rounded chip / node
  chip(s = 26, fill = C.wash) {
    return box(-s / 2, -s / 2, s, s, { rx: 6, fill });
  },
  bars(hs = [0.5, 0.85, 0.65, 1], bw = 12, gap = 8, maxH = 54, fill = C.blue) {
    const w = hs.length * (bw + gap);
    let s = seg(-4, 0, w, 0, { sw: SW });
    hs.forEach((h, i) => (s += box(i * (bw + gap), -h * maxH, bw, h * maxH, { rx: 2, fill: typeof fill === "function" ? fill(i) : fill })));
    return s;
  },
  eye(w = 54) {
    return P(`M ${-w / 2} 0 Q 0 ${-w * 0.42} ${w / 2} 0 Q 0 ${w * 0.42} ${-w / 2} 0 Z`, { fill: C.white }) + dot(0, 0, w * 0.2, { fill: C.blue }) + dot(0, 0, w * 0.08, { fill: C.ink, stroke: "none" });
  },
  ruler(w = 200) {
    let s = box(0, 0, w, 30, { rx: 5, fill: C.wash });
    for (let i = 0; i <= 10; i += 1) s += seg(i * (w / 10), 0, i * (w / 10), i % 5 === 0 ? 30 : 18, { sw: SW });
    return s;
  },
  flag(h = 74) {
    return seg(0, 0, 0, -h, { sw: SW + 1 }) + poly([[0, -h], [38, -h + 11], [0, -h + 22]], { fill: C.blue });
  },
  gauge(w = 92) {
    return (
      P(`M ${-w / 2} 0 A ${w / 2} ${w / 2} 0 0 1 ${w / 2} 0`, { stroke: C.wash, sw: SW + 6 }) +
      P(`M ${-w / 2} 0 A ${w / 2} ${w / 2} 0 0 1 ${w * 0.16} ${-w * 0.47}`, { stroke: C.blue, sw: SW + 6 }) +
      seg(0, 0, -w * 0.28, -w * 0.28, { sw: SW + 1 }) + dot(0, 0, 4.5, { fill: C.ink })
    );
  },
  bracket(h = 60, dir = 1) {
    return P(`M ${8 * dir} ${-h / 2} H 0 V ${h / 2} H ${8 * dir}`, { sw: SW + 0.6 });
  },
  calendar(cols = 5, rows = 3) {
    const cell = 20;
    const w = cols * cell + 10;
    const h = rows * cell + 20;
    let s = box(0, 0, w, h, { rx: 8, fill: C.white }) + box(0, 0, w, 12, { rx: 8, fill: C.ink });
    for (let r = 0; r < rows; r += 1)
      for (let c = 0; c < cols; c += 1) {
        const on = (c + r * 2) % 3 !== 2;
        s += box(6 + c * cell, 16 + r * cell, cell - 5, cell - 5, { rx: 3, fill: on ? C.sky : C.white, sw: SW * 0.7 });
        if (on) s += P(`M ${9 + c * cell} ${25 + r * cell} l 4 4 l 8 -9`, { stroke: C.ink, sw: SW });
      }
    return { markup: s, w, h };
  },
};

// smooth curve helper (used inside chartFrame + a few motifs)
function smooth(x, baseY, w, hs, scale, stroke = C.ink, sw = SW + 0.6) {
  const n = hs.length;
  const step = w / (n - 1);
  let d = `M ${r2(x)} ${r2(baseY - hs[0] * scale)}`;
  for (let i = 1; i < n; i += 1) {
    d += ` Q ${r2(x + (i - 0.5) * step)} ${r2(baseY - hs[i - 1] * scale)} ${r2(x + i * step)} ${r2(baseY - hs[i] * scale)}`;
  }
  return P(d, { stroke, sw });
}

// ---------------------------------------------------------------------------
// composition templates
// ---------------------------------------------------------------------------
// left inputs -> hub -> right outputs, with dashed links
function flowScene({ left = [], hub, right = [], gap = 150 }) {
  const parts = [];
  const hubX = 0;
  const lx = -gap;
  const rx = gap;
  parts.push(G(hub.markup ?? hub, hubX + (hub.dx ?? 0), hub.dy ?? 0));
  const spread = (arr, x) => {
    const step = arr.length > 1 ? 150 / (arr.length - 1) : 0;
    const y0 = arr.length > 1 ? -75 : 0;
    return arr.map((it, i) => {
      const y = y0 + i * step;
      const m = G(it.markup ?? it, x + (it.dx ?? 0), y + (it.dy ?? 0));
      const conn =
        x < 0
          ? link(x + 46, y, hubX - 40, 0, { arrow: true })
          : link(hubX + 40, 0, x - 20, y, { arrow: true });
      return conn + m;
    }).join("");
  };
  parts.push(spread(left, lx));
  parts.push(spread(right, rx));
  return parts.join("");
}
// ---------------------------------------------------------------------------
// motifs (58) — kept small by leaning on the icon + composition helpers
// ---------------------------------------------------------------------------
function centred(markup, w, h) {
  return G(markup, -(w ?? 0) / 2, -(h ?? 0) / 2);
}

const M = {
  // ---- NumPy ----
  ndarray() {
    const p = I.panel(4, 4, 22);
    return centred(p.markup, p.w, p.h) + G(I.cube(12, C.blue), p.w / 2 - 6, -p.h / 2 - 2);
  },
  arrayCreate() {
    const p = I.panel(4, 3, 22, { fill: (c, r) => (r === 0 ? C.wash : C.sky) });
    return G(p.markup, -p.w / 2, -p.h / 2) + G(`${seg(-16, 0, 16, 0, { sw: SW + 2, stroke: C.blue })}${seg(0, -16, 0, 16, { sw: SW + 2, stroke: C.blue })}`, 0, p.h / 2 + 24);
  },
  dtype() {
    let s = box(0, 0, 132, 90, { rx: 10, fill: C.white });
    const marks = [(x, y) => dot(x, y, 8, { fill: C.blue }), (x, y) => box(x - 8, y - 8, 16, 16, { rx: 3, fill: C.sky }), (x, y) => poly([[x, y - 9], [x + 9, y + 7], [x - 9, y + 7]], { fill: C.ink })];
    for (let r = 0; r < 2; r += 1) for (let c = 0; c < 3; c += 1) { s += box(10 + c * 40, 10 + r * 40, 32, 32, { rx: 5, fill: C.wash, sw: SW * 0.8 }); s += marks[(c + r) % 3](26 + c * 40, 26 + r * 40); }
    return centred(s, 132, 90);
  },
  slice() {
    const p = I.panel(5, 5, 18, { fill: (c, r) => (r === 2 || c === 1 ? C.blue : C.wash) });
    return centred(p.markup, p.w, p.h);
  },
  reshape() {
    const a = I.panel(2, 4, 18);
    const b = I.panel(4, 2, 18, { fill: () => C.sky });
    return G(a.markup, -a.w - 34, -a.h / 2) + curveArrow(-30, 6, 26, 6, 34) + G(b.markup, 30, -b.h / 2);
  },
  broadcast() {
    const row = I.panel(3, 1, 20, { fill: () => C.blue });
    const big = I.panel(3, 3, 20);
    return G(big.markup, -big.w / 2, -6) + G(row.markup, -row.w / 2, -big.h / 2 - row.h - 14) +
      [0, 1, 2].map((i) => arrow(-row.w / 2 + 13 + i * 24, -big.h / 2 - 12, -row.w / 2 + 13 + i * 24, -big.h / 2 + 2, { sw: SW })).join("");
  },
  aggregate() {
    const p = I.panel(4, 3, 18);
    return G(p.markup, -p.w / 2, -p.h / 2 - 14) + arrow(0, p.h / 2 - 8, 0, p.h / 2 + 14) + G(box(0, 0, p.w, 20, { rx: 4, fill: C.blue }), -p.w / 2, p.h / 2 + 18);
  },
  missingGrid() {
    const holes = new Set(["1,1", "3,0", "2,3"]);
    const p = I.panel(4, 4, 20, { fill: (c, r) => (holes.has(`${c},${r}`) ? null : C.wash) });
    return centred(p.markup, p.w, p.h);
  },
  pipeline() {
    return flowScene({ left: [{ markup: I.doc(38, 48) }], hub: { markup: G(I.gear(15, C.sky)), dy: 0 }, right: [{ markup: I.panel(3, 3, 16).markup, dx: -20, dy: -28 }], gap: 120 });
  },
  matrixVector() {
    const m = I.panel(3, 3, 20);
    const v = I.panel(1, 3, 20, { fill: () => C.blue });
    return G(m.markup, -m.w / 2 - 26, -m.h / 2) + dot(6, 0, 3.5, { fill: C.ink }) + G(v.markup, 22, -v.h / 2);
  },
  io() {
    const p = I.panel(3, 3, 18);
    return G(p.markup, -p.w / 2 - 70, -p.h / 2) + G(I.cylinder(26, 44), 74, 4) + link(-40, 4, 44, 4, { arrow: true }) + link(44, 22, -40, 22, { arrow: true, stroke: C.blue });
  },
  perf() {
    const p = I.panel(3, 3, 18);
    return G(p.markup, -p.w / 2 - 56, -p.h / 2) + G(I.gauge(96), 66, 26);
  },
  // ---- pandas ----
  dataframe() {
    const t = I.table(4, 4);
    return centred(t.markup, t.w, t.h);
  },
  inspect() {
    const t = I.table(4, 4, { fill: () => C.wash });
    return G(t.markup, -t.w / 2 - 10, -t.h / 2) + G(I.lens(17), t.w / 2 - 4, t.h / 2 - 6);
  },
  transform() {
    return flowScene({ left: [{ markup: I.chip(30, C.wash) }], hub: { markup: G(I.gear(14, C.sky)) }, right: [{ markup: I.chip(30, C.blue) }], gap: 96 });
  },
  sort() {
    return G(I.bars([0.35, 0.55, 0.78, 1, 0.6], 16, 12, 96, (i) => (i === 3 ? C.blue : C.sky)), -70, 48) + curveArrow(70, -8, 96, 24, 26);
  },
  groupby() {
    const t = I.table(3, 5, { fill: (c) => (c === 0 ? C.blue : C.wash) });
    return G(t.markup, -t.w / 2 - 20, -t.h / 2) + G(I.bracket(30, 1), t.w / 2 - 8, -t.h / 2 + 22) + G(I.bracket(30, 1), t.w / 2 - 8, -t.h / 2 + 56) + G(I.bracket(24, 1), t.w / 2 - 8, -t.h / 2 + 86);
  },
  pivot() {
    const a = I.table(4, 2);
    const b = I.panel(2, 4, 16, { fill: () => C.blue });
    return G(a.markup, -a.w / 2, -a.h - 18) + curveArrow(-6, 6, -6, 40, 30) + G(b.markup, -b.w / 2, 40);
  },
  merge() {
    const a = I.table(2, 3, { fill: () => C.sky });
    const b = I.table(2, 3);
    return G(a.markup, -a.w - 40, -a.h / 2) + G(b.markup, 40, -b.h / 2) + link(-38, 0, 38, 0, { arrow: true }) + link(38, 16, -38, 16, { arrow: true, stroke: C.blue });
  },
  timeseries() {
    const t = I.table(4, 2);
    return G(t.markup, -t.w / 2, -t.h - 8) + G(`${seg(0, 0, t.w, 0, { sw: SW })}${[0, 1, 2, 3, 4].map((i) => seg((i * t.w) / 4, -5, (i * t.w) / 4, 6, { sw: SW })).join("")}${dot(t.w * 0.3, 0, 4, { fill: C.blue })}${dot(t.w * 0.7, 0, 4, { fill: C.blue })}`, -t.w / 2, t.h - 4);
  },
  roadmap() {
    const d = "M -140 60 C -70 60 -80 -30 -10 -30 S 80 60 150 60";
    return P(d, { stroke: C.wash, sw: SW + 8 }) + P(d, { stroke: C.ink, sw: SW, dash: "0.1 9" }) +
      [[-140, 60], [-10, -30], [150, 60]].map(([x, y], i) => G(I.chip(24, i === 2 ? C.blue : C.white), x, y) + (i === 1 ? dot(x, y, 3, { fill: C.blue }) : ""), 0, 0).join("") +
      arrowHead(150, 60, 0, 8);
  },
  // ---- matplotlib ----
  axesAnatomy() {
    return centred(I.chartFrame(180, 128, "line"), 180, 128);
  },
  plotBasic() {
    return centred(I.chartFrame(180, 128, "bars"), 180, 128) + G(smooth(0, 0, 130, [0.2, 0.6, 0.4, 0.8], 40, C.blue, SW + 0.6), -70, 30);
  },
  subplots() {
    const kinds = ["line", "bars", "scatter", "line"];
    let s = "";
    kinds.forEach((k, i) => (s += G(I.chartFrame(92, 66, k), (i % 2) * 100 - 96, Math.floor(i / 2) * 76 - 72)));
    return s;
  },
  axisTicks() {
    const f = I.chartFrame(170, 120, "line");
    let ticks = "";
    for (let i = 1; i <= 5; i += 1) ticks += seg(18 + (i * 140) / 5, 106, 18 + (i * 140) / 5, 114, { sw: SW });
    const legend = [C.blue, C.sky, C.ink].map((c, i) => box(120, 10 + i * 13, 14, 8, { rx: 2, fill: c, sw: SW * 0.7 })).join("");
    return centred(f + ticks + legend, 170, 120);
  },
  colormap() {
    let strip = box(0, 0, 220, 40, { rx: 8, fill: C.white });
    for (let i = 0; i < 8; i += 1) strip += box(6 + i * 26.5, 6, 24, 28, { rx: 2, fill: mix(C.wash, C.ink, i / 7), sw: SW * 0.5 });
    return centred(strip, 220, 40);
  },
  annotation() {
    const f = I.chartFrame(180, 124, "line");
    return centred(f, 180, 124) + ring(24, -30, 12, { sw: SW }) + seg(24, -18, 60, 34, { sw: SW, dash: "3 4" }) + dot(60, 34, 4, { fill: C.blue });
  },
  exportImage() {
    return G(I.chartFrame(150, 104, "line"), -75, -80) + seg(0, 34, 0, 74, { sw: SW + 2 }) + poly([[-14, 58], [14, 58], [0, 80]], { fill: C.blue }) + box(-42, 86, 84, 12, { rx: 3, fill: C.ink });
  },
  integrate() {
    const t = I.table(3, 3, { fill: () => C.wash });
    return G(t.markup, -t.w - 30, -t.h / 2) + link(-24, 0, 24, 0, { arrow: true }) + G(I.chartFrame(120, 92, "line"), 30, -46);
  },
  // ---- seaborn ----
  levels() {
    return G(I.chartFrame(140, 140, "line"), -140, -70) + G(I.chartFrame(96, 96, "line"), 24, -30);
  },
  distribution() {
    const hs = [0.28, 0.55, 0.85, 1, 0.8, 0.5, 0.3, 0.16];
    let s = box(0, 0, 210, 150, { rx: 12, fill: C.white });
    s += G(hs.map((h, i) => box(i * 24, 130 - h * 116, 20, h * 116, { rx: 2, fill: C.sky, sw: SW * 0.6 })).join(""), 10, 0);
    s += G(smooth(0, 130, 8 * 24 - 6, hs.map((h) => h + 0.05), 116, C.blue), 12, 0);
    return centred(s, 210, 150);
  },
  categorical() {
    const bx = (x, hi, lo, med) => box(x, hi, 30, lo - hi, { rx: 3, fill: C.white }) + seg(x, med, x + 30, med, { stroke: C.blue, sw: SW + 1 }) + seg(x + 15, hi, x + 15, hi - 16, { sw: SW }) + seg(x + 15, lo, x + 15, lo + 16, { sw: SW });
    return G(`${seg(-10, 118, 148, 118, { sw: SW })}${bx(0, 60, 108, 82)}${bx(52, 40, 96, 70)}${bx(104, 52, 118, 84)}`, -70, -60);
  },
  scatterRel() {
    const f = I.chartFrame(200, 140, "scatter");
    return centred(f, 200, 140);
  },
  regression() {
    const f = I.chartFrame(200, 140, "scatter");
    return centred(f, 200, 140) + G(box(-1, 0, 14, 130, { rx: 2, fill: C.wash, sw: SW * 0.6 }), 92, -60) + G(smooth(0, 130, 12, [0.3, 0.7, 1, 0.6], 100, C.blue, SW), 92, -60);
  },
  heatmap() {
    const n = 5;
    const cell = 26;
    const vals = [[0.1, 0.3, 0.5, 0.2, 0.4], [0.3, 0.9, 0.6, 0.4, 0.2], [0.5, 0.6, 1, 0.7, 0.3], [0.2, 0.4, 0.7, 0.8, 0.5], [0.4, 0.2, 0.3, 0.5, 0.9]];
    let s = box(0, 0, n * cell + 10, n * cell + 10, { rx: 8, fill: C.white });
    for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) s += box(6 + c * cell, 6 + r * cell, cell - 5, cell - 5, { rx: 2, fill: mix(C.wash, C.ink, vals[r][c]), sw: SW * 0.5 });
    return centred(s, n * cell + 10, n * cell + 10);
  },
  palette() {
    const cols = [C.ink, C.blue, "#5f83c4", C.sky, C.wash];
    let s = box(0, 0, cols.length * 34 + 8, 62, { rx: 8, fill: C.white });
    cols.forEach((f, i) => (s += box(6 + i * 34, 6, 30, 50, { rx: 5, fill: f, sw: SW * 0.6 })));
    return centred(s, cols.length * 34 + 8, 62);
  },
  // ---- 시각화 이론 ----
  grammar() {
    const plane = (y, f) => poly([[-100, y], [70, y - 34], [130, y], [-40, y + 34]], { fill: f });
    return plane(52, C.wash) + plane(4, C.sky) + plane(-44, C.blue);
  },
  chartChoice() {
    const node = G(I.chip(38, C.blue), -128, 0);
    const frames = [["line", -66], ["bars", 0], ["scatter", 66]].map(([k, y]) =>
      link(-108, 0, 30, y, { arrow: true }) + G(I.chartFrame(84, 58, k), 34, y - 29)).join("");
    return node + frames;
  },
  perception() {
    return G(I.eye(78), 0, -58) + G(I.bars([0.5, 0.95], 34, 22, 116, (i) => (i ? C.blue : C.wash)), -28, 84);
  },
  scale() {
    const w = 250;
    let s = `<defs><linearGradient id="grad"><stop offset="0" stop-color="${C.wash}"/><stop offset="1" stop-color="${C.ink}"/></linearGradient></defs>`;
    s += box(0, 0, w, 34, { rx: 8, fill: C.white });
    s += box(6, 6, w - 12, 22, { rx: 4, fill: "url(#grad)", sw: 0 });
    for (let i = 0; i <= 8; i += 1) s += seg(6 + i * ((w - 12) / 8), -6, 6 + i * ((w - 12) / 8), 40, { sw: SW });
    return centred(s, w, 34);
  },
  multivariate() {
    let s = box(0, 0, 220, 150, { rx: 12, fill: C.white });
    const gap = 56;
    for (let i = 0; i < 4; i += 1) s += seg(20 + i * gap, 14, 20 + i * gap, 136, { stroke: C.wash, sw: SW + 1 });
    const lines = [[30, 110, 60, 90], [120, 30, 130, 20], [80, 80, 20, 130]];
    const cc = [C.blue, C.ink, "#5f83c4"];
    lines.forEach((ys, si) => { let d = `M 20 ${14 + ys[0]}`; for (let i = 1; i < 4; i += 1) d += ` L ${20 + i * gap} ${14 + ys[i]}`; s += P(d, { stroke: cc[si], sw: SW + 0.4 }); });
    return centred(s, 220, 150);
  },
  // ---- 전처리 이론 ----
  scaleMeasure() {
    const chips = [C.wash, C.sky, C.blue].map((f, i) => box(i * 86, 0, 74, 34, { rx: 6, fill: f })).join("");
    return G(I.ruler(240), -120, -52) + G(chips, -128, 18);
  },
  outlier() {
    const f = I.chartFrame(200, 140, "scatter");
    return centred(f, 200, 140) + dot(70, -34, 7, { fill: C.blue }) + ring(70, -34, 14, { sw: SW, dash: "3 4" });
  },
  encoding() {
    const cats = [C.wash, C.sky, C.blue].map((f, i) => box(0, i * 30, 34, 24, { rx: 5, fill: f })).join("");
    const nums = [0.45, 0.7, 1].map((h, i) => box(0, i * 30, h * 84, 24, { rx: 5, fill: C.blue, sw: SW * 0.7 })).join("");
    return G(cats, -88, -40) + arrow(-44, 6, -6, 6, {}) + G(nums, 6, -40);
  },
  dimreduce() {
    return G(I.cube(36, C.blue), -84, -18) + arrow(-14, 34, 30, 34, { sw: SW + 0.6 }) + G(poly([[0, 0], [116, -22], [150, 30], [34, 52]], { fill: C.wash }), 40, 12);
  },
  imbalance() {
    return G(`${seg(-10, 0, 190, 0, { sw: SW })}${box(20, -140, 56, 140, { rx: 4, fill: C.blue })}${box(120, -28, 56, 28, { rx: 4, fill: C.sky })}`, -90, 70);
  },
  // ---- java ----
  gc() {
    // heap of memory blocks; freed ones become dashed outlines, a sweep arc clears them
    let heap = box(0, 0, 150, 96, { rx: 10, fill: C.white });
    const freed = new Set(["0,1", "2,0", "3,2", "1,2"]);
    for (let r = 0; r < 3; r += 1)
      for (let c = 0; c < 4; c += 1) {
        const x = 10 + c * 34;
        const y = 10 + r * 28;
        if (freed.has(`${c},${r}`)) heap += box(x, y, 28, 22, { rx: 3, fill: "none", dash: "3 3", sw: SW });
        else heap += box(x, y, 28, 22, { rx: 3, fill: (c + r) % 2 ? C.sky : C.blue, sw: SW * 0.8 });
      }
    return G(heap, -75, -48) + curveArrow(-70, -58, 78, -58, 34, { stroke: C.blue, sw: SW + 0.6 });
  },
  branch() {
    const root = G(I.chip(40, C.blue), 0, 0);
    return root +
      arrow(-14, -10, -66, -58, {}) + G(I.chip(38, C.wash), -84, -74) +
      arrow(20, -6, 74, -34, {}) + G(I.chip(36, C.sky), 96, -40) +
      arrow(20, 8, 74, 44, {}) + G(I.chip(36, C.wash), 96, 54);
  },
  nested() {
    return box(-110, -84, 220, 168, { rx: 16, fill: C.wash }) + box(-78, -58, 156, 116, { rx: 13, fill: C.sky }) + box(-46, -32, 92, 64, { rx: 10, fill: C.blue });
  },
  // ---- journal ----
  habit() {
    const c = I.calendar(5, 3);
    return centred(c.markup, c.w, c.h);
  },
  consolidate() {
    const cards = [[-150, -46, -13], [-160, 26, 9], [-132, 96, -5]].map(([x, y, rot]) => G(I.doc(46, 34), x, y, rot)).join("");
    const stack = G(box(0, 24, 78, 56, { rx: 8, fill: C.wash }) + box(6, 14, 78, 56, { rx: 8, fill: C.sky }) + box(12, 4, 78, 56, { rx: 8, fill: C.blue }), 70, 0);
    return cards + link(-58, 30, 58, 34, { arrow: true }) + stack;
  },
  finishFlag() {
    const track = box(-120, 0, 240, 24, { rx: 12, fill: C.white }) + box(-117, 3, 198, 18, { rx: 9, fill: C.blue, sw: 0 });
    return G(track, 0, -12) + G(I.flag(72), 92, 12);
  },
};

// colour mixing ----------------------------------------------------------
function hexToRgb(h) { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const ca = hexToRgb(a); const cb = hexToRgb(b);
  return `#${ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

// ---------------------------------------------------------------------------
// id -> motif
// ---------------------------------------------------------------------------
const MAP = {
  "3ce19946ca7680b48c90fb97102be10c": "ndarray",
  "3ce19946ca768071aabfd696b871a6f8": "arrayCreate",
  "3ce19946ca7680b5bd53de660571e6d2": "dtype",
  "3ce19946ca76801ab1cdf359ecdcf07e": "slice",
  "3ce19946ca7680568905f9100f8e9192": "reshape",
  "3ce19946ca7680649261f238b2bc8181": "broadcast",
  "3ce19946ca768005bc5cc7383a963f96": "aggregate",
  "3ce19946ca7680768ccfde84c5980765": "missingGrid",
  "3ce19946ca76807faa9def831b4cb504": "pipeline",
  "3ce19946ca7680e78c9acb8da7f20f38": "matrixVector",
  "3ce19946ca768063b0e1e8a297019e1e": "io",
  "3ce19946ca7680689d24d8fc50c66587": "perf",
  "3ce19946ca76801d914ce5d0c1a9f881": "dataframe",
  "3ce19946ca7680f09aade69d51fc4014": "io",
  "3ce19946ca76800cb869e94167204db4": "inspect",
  "3ce19946ca7680feb4a3f6dd8439c4b2": "slice",
  "3ce19946ca7680b39ad3e58bb37e15b5": "missingGrid",
  "3ce19946ca768008b586d2599f340817": "transform",
  "3ce19946ca7680f3aab1ed09c080a491": "sort",
  "3ce19946ca768075bbfaee5987ee2017": "groupby",
  "3ce19946ca7680a58e17e1ef1f5f0bd2": "pivot",
  "3ce19946ca76803b86fbf536ae878dba": "merge",
  "3ce19946ca7680f4ad12e64aef10f34c": "timeseries",
  "3ce19946ca7680f7bac7ec38787111f8": "perf",
  "3ce19946ca768086abc3f701bae8b934": "roadmap",
  "3cf19946ca7681b89728e6ec505da82c": "axesAnatomy",
  "3cf19946ca7681a3a538cb7ae266b519": "plotBasic",
  "3cf19946ca768109b3a7ffc0316e422b": "subplots",
  "3cf19946ca7681b49734d816abd8255d": "axisTicks",
  "3cf19946ca7681cbbe26ed818aac5650": "colormap",
  "3cf19946ca76815babb4da01c6777de4": "annotation",
  "3cf19946ca76813eb32ff2a31c344958": "exportImage",
  "3cf19946ca768196a258cce5fac24945": "integrate",
  "3cf19946ca7681718f2cc89aaf11e7b8": "levels",
  "3cf19946ca7681fcbe3ec8e5f91e745a": "distribution",
  "3cf19946ca7681af988bc22a6d4e44f5": "categorical",
  "3cf19946ca76817ebabec10460e7a57f": "scatterRel",
  "3cf19946ca768182b731f659c1d1b08c": "regression",
  "3cf19946ca76816ebac2efc477794575": "heatmap",
  "3cf19946ca768194b117f421e79a1e9c": "palette",
  "3cf19946ca7681169a32f945ea578aa5": "grammar",
  "3cf19946ca7681b78d22d1d4fc08a2a2": "chartChoice",
  "3cf19946ca76811dae3ede3a7c8f12db": "perception",
  "3cf19946ca76811a9d6de5fbd9f1bb91": "scale",
  "3cf19946ca76815aa820cecd0954af15": "multivariate",
  "3cf19946ca7681068c0fc2596847fee1": "scaleMeasure",
  "3cf19946ca7681caaf36cee1e0816907": "missingGrid",
  "3cf19946ca7681979971cbf70e13c58b": "outlier",
  "3cf19946ca768177b804f1dcf7e634eb": "encoding",
  "3cf19946ca768181b844db7274f690fe": "dimreduce",
  "3cf19946ca76818eadf6ef7898eac0da": "imbalance",
  "3cf19946ca7681e2a209d4dd550c41bf": "roadmap",
  "3ce19946ca7680c3bf5ada32fda9842c": "gc",
  "3ce19946ca7680c19677fb9fa7f3dea7": "branch",
  "3c819946ca768094bfebe1e7bea97aa6": "nested",
  "3cf19946ca7680bd9d9ac8cc8bd6b148": "habit",
  "3c819946ca76800686abe41d9548e8b9": "consolidate",
  "3c119946ca7680b3ba08d943827ce08d": "finishFlag",
};

// ---------------------------------------------------------------------------
// svg assembly
// ---------------------------------------------------------------------------
function background() {
  const cells = [];
  for (let x = 0; x <= W; x += 24) cells.push(seg(x, 0, x, H, { stroke: C.grid, sw: x % 96 === 0 ? 1.4 : 0.9 }));
  for (let y = 0; y <= H; y += 24) cells.push(seg(0, y, W, y, { stroke: C.grid, sw: y % 96 === 0 ? 1.4 : 0.9 }));
  return `<rect width="${W}" height="${H}" fill="${C.bg}"/>${cells.join("")}`;
}

function buildSvg(key) {
  const fn = M[key];
  if (!fn) throw new Error(`unknown motif: ${key}`);
  const k = 1.52; // scene authored ~ +/-150px; fill the middle ~70%
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><filter id="sh" x="-25%" y="-25%" width="150%" height="150%">` +
    `<feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#1e2a4f" flood-opacity="0.16"/></filter></defs>` +
    background() +
    `<g filter="url(#sh)" transform="translate(${CX} ${CY}) scale(${k})">${fn()}</g>` +
    `</svg>`
  );
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function parseArgs() {
  const a = process.argv.slice(2);
  const o = { only: null, out: null, force: a.includes("--force") };
  const oi = a.indexOf("--only");
  if (oi !== -1) o.only = new Set(a[oi + 1].split(",").map((s) => s.trim()));
  const di = a.indexOf("--out");
  if (di !== -1) o.out = path.resolve(a[di + 1]);
  return o;
}

function categoryForId(id) {
  const dev = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/indexes/devlog.json"), "utf8"));
  for (const [cat, rows] of Object.entries(dev)) if (rows.some((e) => String(e.source_id || e.id).replaceAll("-", "") === id)) return cat;
  const jr = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/indexes/journal.json"), "utf8"));
  const jdir = { personal: "blog", education: "education" };
  for (const [cat, rows] of Object.entries(jr)) if (rows.some((e) => String(e.source_id || e.id).replaceAll("-", "") === id)) return jdir[cat];
  return null;
}

const placeholderHash = crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(ROOT, "src/assets/thumbnail/placeholder.webp")))
  .digest("hex");

async function render(svg, target) {
  await sharp(Buffer.from(svg)).flatten({ background: C.bg }).webp({ quality: 92 }).toFile(target);
}

async function run() {
  const args = parseArgs();
  const ids = Object.keys(MAP).filter((id) => !args.only || args.only.has(id));
  let written = 0;
  for (const id of ids) {
    const svg = buildSvg(MAP[id]);
    let target;
    if (args.out) {
      fs.mkdirSync(args.out, { recursive: true });
      target = path.join(args.out, `${MAP[id]}__${id}.webp`);
    } else {
      const cat = categoryForId(id);
      if (!cat) { console.warn(`skip ${id}: not in any index`); continue; }
      const rel = requiredThumbnailPath("devlog", cat, id);
      target = path.join(ROOT, ...rel.split("/"));
      if (!args.force && fs.existsSync(target)) {
        const h = crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex");
        if (h !== placeholderHash) { console.log(`keep  ${rel}`); continue; }
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
    }
    await render(svg, target);
    written += 1;
    console.log(`write ${path.relative(ROOT, target)}  [${MAP[id]}]`);
  }
  console.log(`\n${written} thumbnails rendered.`);
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
