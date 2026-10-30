import recommendationData from "@/data/indexes/devlog-recommendations.json";

type PublishedLinkPage = {
  readonly id: string;
  readonly title: string;
  readonly href: string;
};

export function createLegacyLinkResolver(pages: readonly PublishedLinkPage[]) {
  const byId = new Map(pages.map((page) => [page.id.replaceAll("-", "").toLowerCase(), page.href]));
  const byTitle = new Map<string, string | null>();
  for (const page of pages) {
    byTitle.set(page.title, byTitle.has(page.title) ? null : page.href);
  }

  return (href: string): string => {
    const match = /^(?:https:\/\/(?:app\.notion\.com|www\.notion\.so|notion\.so))?\/p\/([^/?#]+)([?#].*)?$/.exec(href);
    const encodedPage = match?.[1];
    if (!encodedPage) return href;
    let page: string;
    try {
      page = decodeURIComponent(encodedPage);
    } catch (error) {
      if (error instanceof URIError) return href;
      throw error;
    }
    const pageId = /(?:^|-)([a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i.exec(page)?.[1];
    const destination = pageId
      ? byId.get(pageId.replaceAll("-", "").toLowerCase())
      : byTitle.get(page);
    // Exported articles do not retain Notion block IDs; keep unknown fragments intact.
    return destination ? `${destination}${match?.[2] ?? ""}` : href;
  };
}

export const resolveLegacyContentLink = createLegacyLinkResolver(recommendationData.pages);
