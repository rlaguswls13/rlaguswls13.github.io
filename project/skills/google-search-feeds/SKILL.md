---
name: google-search-feeds
description: Use when generating or validating sitemap.xml, RSS or Atom feeds, robots.txt references, Search Console sitemap submissions, or reusable discovery feeds for this blog.
---

# Google Search Feeds

검색엔진 전용 산출물과 범용 discovery feed를 분리합니다. 현재 `src/app/sitemap.ts`가 canonical absolute URL 기반 `/sitemap.xml`을 생성하고 `src/app/robots.ts`가 이를 선언합니다. RSS route는 아직 없으므로 추가할 때 sitemap과 동일한 URL source를 공유합니다.

## Sitemap contract

1. `src/app/sitemap.ts`의 static route, published devlog, project URL 생성 규칙을 먼저 읽습니다.
2. sitemap에는 indexable canonical URL만 넣고 draft, redirect, duplicate route, private URL을 제외합니다.
3. 모든 URL은 `siteConfig.siteUrl`을 기준으로 한 absolute HTTPS URL로 생성합니다. GitHub Pages `basePath`와 canonical URL을 혼동하지 않습니다.
4. UTF-8 XML, root `/sitemap.xml`, `robots.txt`의 sitemap URL, 그리고 50,000 URLs/50 MB 제한을 검증합니다. 커지면 sitemap index와 분할 파일을 사용합니다.
5. 동일한 URL registry를 사용해 이후 RSS/Atom feed가 sitemap과 drift하지 않게 합니다.

```bash
npm run build:no-fetch
npm run validate:export
curl -fsSL https://<site>/sitemap.xml
curl -fsSL https://<site>/robots.txt
```

Search Console에서는 **Sitemaps → Add a new sitemap**에 `sitemap.xml`을 제출합니다. 제출은 crawl/indexing 힌트이며 색인이나 순위를 보장하지 않습니다.

## RSS/Atom contract

RSS는 Google 전용 파일이 아니라 최신 콘텐츠 배포와 범용 feed discovery용으로 만듭니다.

- 권장 경로: `/rss.xml` 또는 `/feed.xml`; `Content-Type: application/rss+xml; charset=utf-8`
- RSS 2.0 `channel`, `title`, `link`, `description`, `lastBuildDate`, `item`을 생성합니다.
- 각 item은 absolute `link`, stable permalink `guid`, `title`, escaped `description`, `pubDate`를 가집니다.
- 최신 published devlog/journal만 넣고 전체 URL coverage는 sitemap이 책임집니다.
- HTML escape, XML 선언, 날짜의 RFC 822/UTC 변환, duplicate guid를 테스트합니다.
- layout에 `application/rss+xml` alternate link를 추가하면 브라우저·feed reader가 자동 발견할 수 있습니다.

Next App Router에서는 `src/app/rss.xml/route.ts`의 `GET` route와 shared URL/content builder를 사용합니다. `new URL()`로 absolute URL을 만들고 `Response`로 XML을 반환합니다. feed에 secret, token, internal path를 포함하지 않습니다.

## Verification matrix

| Surface | Check |
| --- | --- |
| `/sitemap.xml` | HTTP 200, valid XML, canonical absolute URLs, no duplicates |
| `/rss.xml` or `/feed.xml` | HTTP 200, RSS/Atom schema, escaped text, stable guid |
| `/robots.txt` | sitemap URL points to the public canonical host |
| Search Console | submitted sitemap status is readable and errors are investigated |
| Generic consumers | feed URL works without Search Console and advertises the declared media type |

공식 참고: [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Sitemaps protocol](https://www.sitemaps.org/protocol.html), [RSS 2.0 specification](https://www.rssboard.org/rss-specification)
