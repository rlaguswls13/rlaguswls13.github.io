---
name: google-search-console-operations
description: Use when registering this blog in Google Search Console, configuring ownership verification, checking the verification tag on the live site, or troubleshooting property and verification failures.
---

# Google Search Console Operations

Search Console property 등록과 소유권 verification을 수행합니다. 현재 저장소 구현은 URL-prefix property의 HTML meta tag 방식이며 공개 환경변수 `SEARCH_CONSOLE_VERIFICATION`의 content 값만 빌드에 반영합니다.

## Read before changing

- `wiki/operations/guide.md`
- `scripts/config/generate-build-resources.mjs`
- `src/app/layout.tsx`
- `src/app/robots.ts`
- `.github/workflows/deploy.yml`
- `tests/workflows/deploy-contract.test.ts`

## Register and verify

1. Search Console property selector에서 **Add property**를 선택합니다.
2. 전체 domain과 모든 protocol/subdomain을 관리하려면 Domain property를 선택하고 DNS TXT verification을 사용합니다. 특정 protocol/host/path만 관리하거나 GitHub Pages URL을 직접 확인하려면 URL-prefix property를 선택합니다.
3. URL-prefix property의 HTML tag 방법으로 발급된 `<meta name="google-site-verification" content="...">`에서 `content` 값만 복사합니다.
4. GitHub Environment `github-pages`의 공개 Variable `SEARCH_CONSOLE_VERIFICATION`에 content 값을 설정합니다. HTML file token이나 DNS secret은 이 변수에 넣지 않습니다.
5. 배포 후 비로그인 상태에서 homepage source를 열어 meta tag가 `<head>` 안에 있는지 확인하고 Search Console의 Verify를 누릅니다.

```bash
npm run generate-build-resources
npx vitest run tests/config/build-resources.test.mjs tests/workflows/deploy-contract.test.ts
curl -fsSL https://<site>/ | rg 'google-site-verification'
curl -fsSL https://<site>/robots.txt
```

## Confirm status later

- Search Console property selector에서 정확한 protocol, host, path가 선택되었는지 확인합니다.
- **Settings → Ownership verification**에서 현재 검증 방법과 owner 상태를 확인합니다.
- URL-prefix property는 `http`/`https`, `www`/non-`www`, path가 서로 다른 property입니다. canonical URL과 정확히 일치시킵니다.
- verification tag를 삭제하거나 바꾸면 소유권이 잃을 수 있으므로 교체 전 새 방법을 추가하고 재검증합니다.
- property 등록은 데이터 수집을 시작하지만 Search 결과 반영이나 즉시 색인을 보장하지 않습니다.

## Troubleshooting

- `Verification token not found`: live homepage의 최종 HTML `<head>`를 확인하고 redirect 후 도착 페이지에도 tag가 있는지 확인합니다.
- `Wrong property`: Search Console property가 실제 `siteUrl`과 protocol/host/path까지 같은지 확인합니다.
- `Domain property`에 meta tag를 사용하려는 경우: DNS TXT verification으로 전환합니다.
- source에는 tag가 있지만 실패하는 경우: CDN/cache를 purge하고 비로그인 요청으로 다시 확인합니다.

공식 참고: [Add a website or platform property](https://support.google.com/webmasters/answer/34592), [Verify your site ownership](https://support.google.com/webmasters/answer/9008080), [Property Settings](https://support.google.com/webmasters/answer/7687465)
