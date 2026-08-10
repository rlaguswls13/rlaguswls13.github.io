/**
 * Rate-limited Notion REST API client using native fetch.
 */
export class NotionClient {
  constructor(token, options = {}) {
    if (!token) {
      throw new Error("NOTION_TOKEN is required.");
    }
    this.token = token;
    this.apiVersion = options.apiVersion || "2025-09-03";
    this.baseUrl = "https://api.notion.com/v1";
    this.minDelayMs = options.minDelayMs || 350; // ~3 requests per second limit
    this.lastRequestTime = 0;
  }

  async request(endpoint, options = {}, retries = 3) {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    if (new URL(url).origin !== new URL(this.baseUrl).origin) {
      throw new Error("Notion API endpoint must use the configured API host.");
    }
    
    // Throttle requests to respect Notion rate limits
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minDelayMs - elapsed));
    }
    this.lastRequestTime = Date.now();

    const headers = {
      Authorization: `Bearer ${this.token}`,
      "Notion-Version": this.apiVersion,
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 429) {
        const retryAfterSec = parseInt(response.headers.get("retry-after") || "2", 10);
        console.warn(`[NotionClient] 429 Rate limited. Waiting ${retryAfterSec}s before retrying...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000));
        return this.request(endpoint, options, retries - 1);
      }

      if (!response.ok) {
        if (response.status >= 500 && retries > 0) {
          const backoff = (4 - retries) * 1000;
          console.warn(`[NotionClient] HTTP ${response.status}. Retrying in ${backoff}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          return this.request(endpoint, options, retries - 1);
        }
        const errorText = await response.text();
        throw new Error(`Notion API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (err) {
      if (retries > 0 && err.message && err.message.includes("fetch failed")) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.request(endpoint, options, retries - 1);
      }
      throw err;
    }
  }

  async queryCollection(sourceId, body = {}, sourceType = "data_source") {
    const results = [];
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      const payload = {
        page_size: 100,
        ...body,
        start_cursor: nextCursor,
      };

      const isLegacyDatabase = sourceType === "database";
      const endpoint = isLegacyDatabase
        ? `/databases/${sourceId}/query`
        : `/data_sources/${sourceId}/query`;
      const data = await this.request(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: isLegacyDatabase
          ? { "Notion-Version": "2022-06-28" }
          : { "Notion-Version": "2025-09-03" },
      });

      results.push(...(data.results || []));
      hasMore = data.has_more;
      nextCursor = data.next_cursor;
    }

    return results;
  }

  async queryDataSource(dataSourceId, body = {}) {
    return this.queryCollection(dataSourceId, body, "data_source");
  }

  async queryDatabase(databaseId, body = {}) {
    return this.queryCollection(databaseId, body, "database");
  }

  async getBlockChildren(blockId) {
    const results = [];
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      const url = `/blocks/${blockId}/children?page_size=100${nextCursor ? `&start_cursor=${nextCursor}` : ""}`;
      const data = await this.request(url, { method: "GET" });

      results.push(...(data.results || []));
      hasMore = data.has_more;
      nextCursor = data.next_cursor;
    }

    return results;
  }

  async getPage(pageId) {
    return this.request(`/pages/${pageId}`, { method: "GET" });
  }

  async search(query = "", filter = undefined) {
    const body = { query };
    if (filter) body.filter = filter;
    return this.request(`/search`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}
