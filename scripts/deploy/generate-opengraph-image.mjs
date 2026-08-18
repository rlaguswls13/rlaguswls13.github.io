import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

const EYEBROW = "TECH LOG";
const TAGLINE = "Java & Spring Boot 기반 풀스택 개발자";
const DOMAIN = "rlaguswls13.github.io";
export const OPENGRAPH_IMAGE_WIDTH = 1200;
export const OPENGRAPH_IMAGE_HEIGHT = 630;

function buildElement(siteAuthor, coverImageDataUrl) {
  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        backgroundColor: "#121212",
        backgroundImage: [
          "linear-gradient(rgba(18,18,18,0.93), rgba(18,18,18,0.93))",
          "radial-gradient(circle at 88% 88%, rgba(3,218,198,0.35), transparent 48%)",
          "radial-gradient(circle at 15% 15%, rgba(187,134,252,0.22), transparent 45%)",
          `url(${coverImageDataUrl})`,
        ].join(", "),
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "'Noto Sans KR'",
      },
    },
    h("div", { style: { display: "flex", fontSize: 28, letterSpacing: 6, color: "#03DAC6", fontWeight: 700 } }, EYEBROW),
    h("div", { style: { display: "flex", marginTop: 24, fontSize: 112, fontWeight: 700, color: "#F5F5F5" } }, siteAuthor),
    h("div", { style: { display: "flex", marginTop: 20, fontSize: 36, fontWeight: 400, color: "#BB86FC" } }, TAGLINE),
    h("div", { style: { display: "flex", marginTop: 64, fontSize: 24, fontWeight: 400, color: "#8A8A8A" } }, DOMAIN),
  );
}

// Next.js's `opengraph-image.tsx` file convention emits a route with no file
// extension under `output: export`, and GitHub Pages then serves it as
// application/octet-stream instead of image/png (vercel/next.js#82177).
// Rendering the same ImageResponse at build time into a real `.png` file
// under public/ sidesteps that bug for this static-hosted deployment.
export async function generateOpengraphImage(outputDirectory, { root = process.cwd() } = {}) {
  const profile = JSON.parse(await readFile(path.join(root, "src", "data", "pages", "main", "profile.json"), "utf8"));
  const fontsDirectory = path.join(root, "src", "assets", "og-fonts");
  const [regular, bold, coverImage] = await Promise.all([
    readFile(path.join(fontsDirectory, "NotoSansKR-Regular.ttf")),
    readFile(path.join(fontsDirectory, "NotoSansKR-Bold.ttf")),
    readFile(path.join(root, "src", "assets", "og-image", "blog-cover.jpg")),
  ]);
  const coverImageDataUrl = `data:image/jpeg;base64,${coverImage.toString("base64")}`;

  const response = new ImageResponse(buildElement(profile.profile.name, coverImageDataUrl), {
    width: OPENGRAPH_IMAGE_WIDTH,
    height: OPENGRAPH_IMAGE_HEIGHT,
    fonts: [
      { name: "Noto Sans KR", data: regular, weight: 400, style: "normal" },
      { name: "Noto Sans KR", data: bold, weight: 700, style: "normal" },
    ],
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(outputDirectory, "opengraph-image.png"), buffer);
}
