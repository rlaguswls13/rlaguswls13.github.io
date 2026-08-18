import recommendationData from "@/data/indexes/devlog-recommendations.json";
import { buildRssFeed } from "@/lib/seo/rss";
import { buildStaticRouteMetadata } from "@/lib/seo/routes";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const root = buildStaticRouteMetadata("root");
  const xml = buildRssFeed({
    siteUrl: siteConfig.siteUrl,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
    title: root.title,
    description: root.description,
    entries: recommendationData.pages,
  });

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
