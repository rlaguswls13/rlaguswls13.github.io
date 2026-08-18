---
name: google-adsense-operations
description: Use when connecting Google AdSense to this blog, configuring publisher metadata or ads.txt, validating a deployment, checking AdSense site ownership, or troubleshooting ads.txt and review status.
---

# Google AdSense Operations

AdSense 연결·배포·검증을 수행합니다. 저장소의 현재 경계는 `ADSENSE_ACCOUNT` 공개 publisher ID, `<meta name="google-adsense-account">`, 루트 `ads.txt`입니다.

## Read before changing

- `wiki/operations/guide.md`
- `scripts/config/generate-build-resources.mjs`
- `scripts/deploy/publish-ads-txt.mjs`
- `src/app/layout.tsx`
- `.github/workflows/deploy.yml`

## Setup

1. AdSense에서 **Sites → Add site**로 실제 canonical site URL을 등록합니다.
2. AdSense가 제시한 소유권 확인 방식(code, meta tag, 또는 ads.txt)을 확인합니다. 이 저장소는 publisher metadata와 `ads.txt`를 정적 빌드에 반영합니다.
3. GitHub Environment `github-pages`의 Variables에 `ADSENSE_ACCOUNT`를 설정합니다. publisher ID는 공개 설정이지만 token·로그인 정보는 저장하지 않습니다.
4. 로컬에서는 `.env.local.yml` 또는 허용된 환경변수로만 설정하고 커밋하지 않습니다.

## Verify deployment

```bash
npm run generate-build-resources
npx vitest run tests/config/build-resources.test.mjs tests/workflows/deploy-scripts.test.mjs tests/workflows/deploy-contract.test.ts
```

배포 후 익명 브라우저 또는 `curl`로 다음을 확인합니다.

```bash
curl -fsSI https://<site>/ads.txt
curl -fsSL https://<site>/ads.txt
curl -fsSL https://<site>/ | rg 'google-adsense-account'
```

- `/ads.txt`가 HTTP 200이고 응답 본문이 AdSense가 발급한 publisher line과 일치해야 합니다.
- homepage `<head>`에 `google-adsense-account`가 있을 때만 metadata 연결을 인정합니다.
- 설정하지 않은 빌드에서는 stale `public/ads.txt`가 제거되어야 합니다.
- AdSense Sites에서 ads.txt의 last crawled 상태와 `Check for updates`를 확인합니다.
- 사이트가 AdSense review를 통과하고 `Ready`가 되기 전에는 광고 노출을 성공으로 간주하지 않습니다.

## Safety

- publisher ID와 AdSense API credential을 혼동하지 않습니다. credential은 환경변수/GitHub Secret 외에 기록하지 않습니다.
- `ads.txt`의 vendor ID, relationship, certification ID를 임의로 바꾸지 않습니다.
- AdSense 연결 실패와 Search Console verification 실패를 하나의 상태로 보고하지 않습니다.

공식 참고: [Connect your site to AdSense](https://support.google.com/adsense/answer/7584263), [AdSense site management](https://support.google.com/adsense/answer/12131223), [ads.txt guide](https://support.google.com/adsense/answer/7532444)
