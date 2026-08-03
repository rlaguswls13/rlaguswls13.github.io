import devlogSlugs from "@/data/config/slugs.json";
import devlogRoutes from "@/data/config/routes.json";

type SlugMap = Record<string, Record<string, string>>;
type RouteMap = Record<string, {
  byPageId: Record<string, string>;
  bySlug: Record<string, { id: string; url: string }>;
}>;

const slugMap = devlogSlugs as SlugMap;
const routeMap = devlogRoutes as RouteMap;

export function getDevlogStorageId(category: string, id: string) {
  const value = String(id || "").trim();
  return value.replaceAll("-", "");
}

export function getDevlogSlug(category: string, id: string) {
  const storageId = getDevlogStorageId(category, id);
  return slugMap[category]?.[storageId] || storageId;
}

export function getDevlogHref(category: string, id: string) {
  const storageId = getDevlogStorageId(category, id);
  return routeMap[category]?.byPageId[storageId]
    || `/devlog/${category}/${getDevlogSlug(category, id)}`;
}

export function getDevlogIdBySlug(category: string, slug: string) {
  return routeMap[category]?.bySlug[slug]?.id;
}
