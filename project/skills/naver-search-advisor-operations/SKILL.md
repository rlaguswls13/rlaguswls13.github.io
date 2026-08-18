---
name: naver-search-advisor-operations
description: Use when registering this blog in Naver Search Advisor, configuring ownership verification, checking the verification tag on the live site, or troubleshooting site registration and verification failures.
---

# Naver Search Advisor Operations

네이버 서치어드바이저 사이트 등록과 소유권 verification을 수행합니다. 현재 저장소 구현은 HTML meta tag 방식이며 공개 환경변수 `NAVER_SITE_VERIFICATION`의 content 값만 빌드에 반영합니다. Google Search Console과 동일한 배선 패턴을 사용하므로 [`google-search-console-operations`](../google-search-console-operations/SKILL.md)와 함께 읽습니다.

## Read before changing

- `project/wiki/operations/guide.md`
- `scripts/config/generate-build-resources.mjs`
- `src/lib/giscus-info.ts`
- `src/app/layout.tsx`
- `src/app/robots.ts`
- `.github/workflows/deploy.yml`
- `tests/config/build-resources.test.mjs`

## Register and verify

1. https://searchadvisor.naver.com 에서 로그인 후 **웹마스터 도구 → 사이트 등록**으로 canonical site URL을 등록합니다.
2. 소유확인 방식에서 **HTML 태그** 방식을 선택합니다. HTML 파일 업로드 방식은 이 저장소의 정적 export 배선과 맞지 않아 사용하지 않습니다.
3. 발급된 `<meta name="naver-site-verification" content="...">`에서 `content` 값만 복사합니다.
4. GitHub Environment `github-pages`의 공개 Variable `NAVER_SITE_VERIFICATION`에 content 값을 설정합니다. 로컬 검증용으로는 `.env.local.yml`의 `NAVER_SITE_VERIFICATION=`에 채워 넣습니다(커밋 금지).
5. 배포 후 비로그인 상태에서 homepage source를 열어 `naver-site-verification` meta tag가 `<head>` 안에 있는지 확인하고 서치어드바이저의 **소유확인** 버튼을 누릅니다.

```bash
npm run generate-build-resources
npx vitest run tests/config/build-resources.test.mjs
curl -fsSL https://<site>/ | rg 'naver-site-verification'
curl -fsSL https://<site>/robots.txt
```

## Confirm status later

- 서치어드바이저 **사이트 관리**에서 등록된 URL이 canonical `siteUrl`(protocol/host/path)과 정확히 일치하는지 확인합니다.
- **요청 → 사이트맵 제출**에 `https://<site>/sitemap.xml`을 제출합니다. `robots.txt`도 동일한 sitemap URL을 선언하므로 별도 배선이 필요 없습니다.
- verification tag를 삭제하거나 값을 바꾸면 소유권을 잃을 수 있으므로 교체 전 새 값을 먼저 배포하고 재검증합니다.
- 사이트 등록은 수집을 시작할 뿐이며 검색 노출이나 즉시 색인을 보장하지 않습니다.

## Troubleshooting

- `소유확인 실패`: 배포된 homepage의 최종 HTML `<head>`에 tag가 있는지, `NAVER_SITE_VERIFICATION` Variable이 실제로 설정되었는지 확인합니다(`generate-build-resources` 실행 시 값이 비어 있으면 meta tag 자체가 생성되지 않습니다).
- source에는 tag가 있지만 실패하는 경우: CDN/브라우저 캐시를 무시하고 비로그인 요청으로 다시 확인합니다.
- Google Search Console verification과 상태를 혼동하지 않습니다. 두 플랫폼은 서로 다른 meta tag(`google-site-verification` vs `naver-site-verification`)를 사용하며 독립적으로 확인해야 합니다.

공식 참고: [네이버 서치어드바이저 가이드](https://searchadvisor.naver.com/guide)
