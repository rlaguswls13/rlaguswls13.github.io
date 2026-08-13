import type { MetadataRoute } from "next";
import recommendationData from "@/data/indexes/devlog-recommendations.json";
import projectsData from "@/data/indexes/projects.json";
import { siteConfig } from "@/lib/site";

const SITE_URL = siteConfig.siteUrl;

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/about", "/projects", "/devlog", "/journal", "/tags", "/career", "/contact"];
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: new URL(route || "/", SITE_URL).href,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));

  const devlogEntries: MetadataRoute.Sitemap = recommendationData.pages.map((entry) => ({
    url: new URL(entry.href, SITE_URL).href,
    lastModified: entry.date ? new Date(entry.date.replaceAll(".", "-")) : undefined,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const projectEntries: MetadataRoute.Sitemap = projectsData.projects.map((project) => ({
    url: new URL(`/projects/${project.slug || project.id}`, SITE_URL).href,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...projectEntries, ...devlogEntries];
}
