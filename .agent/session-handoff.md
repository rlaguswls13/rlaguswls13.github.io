---
handoff_version: 1
status: ready
updated_at: 2026-08-18T09:45:00+09:00
agent: Claude Code
---

## RSS 피드 구현 checkpoint (2026-08-18)

- 사용자가 `rss.xml`이 보이지 않는다고 지적해 확인한 결과, `google-search-feeds` skill 문서에 이미 스펙은 있었으나("RSS route는 아직 없음") 실제 구현이 없었습니다. 스펙대로 신규 구현했습니다.
- `src/lib/seo/rss.ts` — 순수 함수 `buildRssFeed()`. escape, RFC 822/UTC `pubDate` 변환, 최신순 정렬, guid 기준 dedup, `itemLimit`(기본 20) 담당. `tests/seo/rss.test.ts` 6개 테스트로 커버.
- `src/app/rss.xml/route.ts` — `GET` route handler, `dynamic = "force-static"`. `devlog-recommendations.json`(sitemap과 동일 source, journal 콘텐츠도 devlog `blog` 카테고리로 이미 발행되어 있어 별도 journal 소스 불필요)과 `siteConfig`, `buildStaticRouteMetadata("root")`를 주입해 `buildRssFeed()` 호출.
- `src/lib/seo/metadata.ts`의 `buildPageMetadata()`에 `alternates.types["application/rss+xml"]`을 추가해 모든 페이지 `<head>`에 `<link rel="alternate" type="application/rss+xml">` 자동 삽입.
- `project/skills/google-search-feeds/SKILL.md`를 실제 구현 상태로 갱신(스펙 문서 → 구현 반영 문서), RAG 인덱스 재생성(32 documents, `wiki:index:check` PASS).
- 검증: `npx vitest run tests/seo/rss.test.ts` 6/6 PASS, 전체 unit 178/179(무관한 기존 `deploy-contract.test.ts` 실패 1건 제외) PASS, `npm run typecheck`/`lint:ci`/`validate:content` PASS, 실제 `next build` 후 `out/rss.xml` 20 items 확인, `npm run validate:export` PASS(95 routes, 0 blockers).

## 환경변수 rename checkpoint (2026-08-18)

- 사용자 요청으로 `NAVER_SITE_VERIFICATION` 환경변수명을 `SEARCH_ADVISER_VERIFICATION`으로 교체했습니다. 내부 config 필드명(`naver.siteVerification`)과 실제 HTML meta 태그명(`naver-site-verification`, 네이버가 요구하는 고정 값)은 변경하지 않았습니다 — env var 이름만 바뀐 것입니다.
- 변경 파일: `.env.local.yml`(gitignored, 사용자가 직접 실 소유확인 토큰을 채워 넣음), `scripts/config/generate-build-resources.mjs`, `.github/workflows/deploy.yml`, `tests/config/build-resources.test.mjs`, `project/wiki/operations/guide.md`, `project/skills/naver-search-advisor-operations/SKILL.md`.
- 검증: `npm run typecheck`/`lint:ci` PASS, `npx vitest run tests/config` PASS(10/10), 실제 `next build` 후 `out/index.html`에 `<meta name="naver-site-verification" content="c70da3cf7f445873e4effc6281cfaab00c4eb3c1">`가 실제 토큰으로 렌더링됨을 확인, `npm run validate:export` PASS(95 routes, 0 blockers).
- GitHub Actions Variable도 기존에 `NAVER_SITE_VERIFICATION`으로 설정했다면 `SEARCH_ADVISER_VERIFICATION`으로 다시 설정해야 배포본에 태그가 반영됩니다.

## SEO/검색엔진 등록 정비 checkpoint (2026-08-18)

- 목표: 네이버 서치어드바이저 가이드(https://searchadvisor.naver.com/guide)와 구글 서치 콘솔 가이드에 맞춰 sitemap.xml, ads.txt, Open Graph, 콘텐츠 마크업(구조화 데이터), 소유권 meta, robots meta, robots.txt를 점검하고 빠진 부분을 구현했습니다.
- 기존 확인: sitemap.xml(`src/app/sitemap.ts`), robots.txt(`src/app/robots.ts`), ads.txt(`scripts/deploy/publish-ads-txt.mjs`), 구조화 데이터(`src/lib/seo/JsonLd.tsx`), Google 소유권 meta는 이미 구현되어 있었습니다.
- 신규 구현: (1) `naver-site-verification` meta 태그 — `.env.local.yml`/`NAVER_SITE_VERIFICATION` → `generate-build-resources.mjs` → `giscus-info.ts`/`giscus-info.mjs`(`naver.siteVerification`) → `layout.tsx` 전배선, `.github/workflows/deploy.yml`에 Actions Variable 추가. (2) 모든 페이지에 명시적 `robots` meta(`index,follow`, `max-image-preview:large`) 추가(`src/lib/seo/metadata.ts`). (3) `og:image`/`twitter:image`가 아예 없던 것을 발견해 `/opengraph-image.png`(1200x630) 파이프라인 신규 구축.
- Open Graph 이미지: `scripts/deploy/generate-opengraph-image.mjs`가 `next/og`의 `ImageResponse`를 순수 Node 스크립트에서 호출해 `generate-build-resources` 실행 시 `public/opengraph-image.png`를 렌더링합니다. 소스 자산은 `src/assets/og-fonts/NotoSansKR-{Regular,Bold}.ttf`(사용 문구만 서브셋)와 사용자가 제공한 `src/assets/og-image/blog-cover.jpg`. 배경은 진한 다크 스크림 + 사이트 accent(퍼플/틸) radial gradient로 원본 스톡 이미지의 텍스트를 거의 지우고 그 위에 실제 사이트 타이틀(김현진/TECH LOG)을 렌더링합니다.
- 발견한 버그: Next.js `output: export` + `src/app/opengraph-image.tsx` 파일 컨벤션 조합은 확장자 없는 산출 파일을 만들어 GitHub Pages가 `image/png` 대신 `application/octet-stream`으로 서빙합니다([vercel/next.js#82177](https://github.com/vercel/next.js/issues/82177)). `opengraph-image.tsx`를 삭제하고 빌드 스크립트에서 `.png` 확장자를 가진 정적 파일로 직접 생성하는 방식으로 우회했습니다. `twitter:card`도 `summary`→`summary_large_image`로 수정했습니다.
- 파비콘: 사용자가 세션 중간에 `public/images/favicon.jpg`를 추가로 제공해 `src/app/icon.jpg`(Next.js 정적 파일 컨벤션)로 배치했습니다. 이 컨벤션은 확장자가 유지되어 opengraph-image와 같은 문제가 없습니다.
- 문서: 이 저장소의 canonical 문서 위치(`project/wiki/`, `project/skills/`)를 따라 `project/wiki/operations/guide.md`(네이버/OG 환경변수·인증 절차), `project/wiki/architecture/tech-stack.md`(SEO 메타데이터·OG 이미지 파이프라인 아키텍처), `project/wiki/index.md`(nav 업데이트)를 갱신하고, 기존 `google-search-console-operations` 패턴을 그대로 따라 신규 skill `project/skills/naver-search-advisor-operations/`(SKILL.md + agents/openai.yaml)를 추가했습니다. `google-search-feeds/SKILL.md`에 네이버 사이트맵 제출 한 줄을 추가했습니다. RAG 인덱스는 `npm run wiki:index`로 재생성했습니다(32 documents).
- 검증: `npm run typecheck`, `npm run lint:ci`, `npm run wiki:index:check`(32 documents current), `npm run validate:content`(87 files) 모두 PASS. `npx vitest run` 173개 중 172 PASS — 유일한 실패는 이 작업과 무관한 기존 `tests/workflows/deploy-contract.test.ts`의 `fetch-notion.yml` secret 이름 불일치(이전 checkpoint에서 이미 알려진 미해결 항목, 이번 세션에서 손대지 않음). 실제 `next build` 후 `npm run validate:export` PASS(95 routes, 0 blockers) — `out/opengraph-image.png`, `out/icon.jpg` 모두 올바른 확장자로 생성되고 `<head>`의 og:image/twitter:image/robots/naver-site-verification meta가 기대대로 렌더링됨을 직접 확인했습니다.
- 남은 사용자 작업: https://searchadvisor.naver.com 에서 사이트 등록 후 발급받는 소유확인 코드를 로컬 `.env.local.yml`의 `NAVER_SITE_VERIFICATION=`과 GitHub repo Variable `NAVER_SITE_VERIFICATION`에 채워 넣어야 실제 meta 태그가 생성됩니다(현재는 빈 값이라 태그가 출력되지 않음, 정상 동작). 등록 후 서치어드바이저와 구글 서치 콘솔 양쪽에 `/sitemap.xml`을 제출해야 합니다.
- 커밋 범위: 위 변경 전체(신규 SEO 기능 + 문서). `.omc/wiki/seo.md`(OMC 플러그인 로컬 wiki 도구로 작성한 보조 메모)는 이 저장소의 canonical 문서가 아니므로 커밋 대상에서 제외했습니다 — 필요하면 `project/wiki/`가 authoritative 소스입니다.

## Notion fetch failure diagnosis (2026-08-14)

- 목표: 반복 실패하는 GitHub Actions `Fetch Notion content`의 원인을 최신 실행 로그와 환경 계약으로 확정합니다.
- 성공 조건: 실패 단계, 원인 층, 재현 가능한 토글 증거, 다음 수정 범위를 비밀 값 노출 없이 기록합니다.
- 결과: 8개 연속 실패가 모두 API 호출 전 `journal` source group 미구성 오류였습니다. workflow는 비어 있는 `NOTION_DATA_SOURCE_ID_*` Secret만 전달하고, 실제 환경에 존재하는 호환 `NOTION_PAGE_ID_*` Secret을 전달하지 않습니다.
- 토글 증거: 현재 빈 data-source 입력은 동일 오류를 재현하고, page-ID 형식 세 그룹을 전달하면 같은 parser가 `journal/devlog/project`를 각 1개로 구성합니다.
- 배제: Notion API 인증·schema·thumbnail 단계에는 도달하지 않았고 commit 단계도 모두 skipped여서 이번 실패 원인이 아닙니다.
- 다음 태스크: workflow에 기존 page-ID Secret 호환 연결을 추가하고 `tests/workflows/deploy-contract.test.ts`를 failing-first로 갱신한 뒤 실제 Actions Fetch → Commit → Deploy를 확인합니다.
- 기존 `.agent/session-handoff.md`, `project/wiki/session-memory.md`, `.omc/` 변경은 보존합니다.

## Resume audit checkpoint (2026-08-13)

- 사용자의 재개 요청에 따라 baton, Git 이력, durable memory, 원격 동기화 상태를 다시 확인했습니다.
- 이전 runtime error 해결 기록은 `project/wiki/session-memory.md`에 이미 반영되어 있고 `main`과 `origin/main`은 동일합니다.
- 현재 source/generated-content diff는 없으며 PR review 대상 변경도 없습니다. 관련 없는 `.omc/` tool state는 그대로 보존했습니다.
- `npm run session:end`를 `commit: false`로 실행했고 hook은 정상 종료했습니다. 3001 포트는 비어 있습니다.
- 남은 구현 작업은 없습니다. 새 기능 요청이 들어오면 이 ready baton에서 새 작업을 시작합니다.

## Runtime error resolution checkpoint (2026-08-13)

- 원인: 2026-08-12 16:38부터 남아 있던 정적 preview 프로세스 `serve out --listen 3001 --no-clipboard`(PID 42988)가 개발 서버와 같은 3001 포트를 점유했습니다. `npm run dev:no-fetch`는 모든 generator를 완료한 뒤 `EADDRINUSE`로 종료됐습니다.
- 해결: command line을 검증한 PID 42988만 종료했습니다. 저장소 소스는 수정하지 않았고 기존 dirty worktree를 보존했습니다.
- red→green: 점유 상태에서 `npm run dev:no-fetch`와 `npx next dev --port 3001`이 각각 exit 1; 점유 프로세스 종료 후 같은 `npm run dev:no-fetch`가 `Ready in 562ms`에 도달하고 `/`가 HTTP 200을 반환했습니다.
- 브라우저 QA: `npx playwright test tests/e2e/home.spec.ts --project=chrome --headed` PASS 1/1. 한국어 홈이 실제 Chrome에서 정상 렌더링됐습니다.
- 전체 검증: `npm run verify` PASS (26 files, 173 tests); `npm run build:local` PASS; `npm run validate:export` PASS (95 routes, 0 blockers).
- 종료 상태: QA용 dev process와 임시 로그를 정리하고 3001 포트를 비워 둡니다. 다음 실행은 `npm run dev:no-fetch`를 사용합니다.
- 잔여 비차단 경고: `127.0.0.1`로 dev HMR에 접근하면 Next.js `allowedDevOrigins` 경고가 발생합니다. 구성된 사용자 URL `http://localhost:3001` 사용 시 본 오류와 무관합니다.
- 남은 태스크: 최종 Wiki 반영 및 PR review 요청은 session-end hook 결과에 따라 후속으로 남깁니다. 이번 해결에는 source diff가 없어 별도 PR 변경은 없습니다.

## Finish checkpoint (2026-08-11)

- Session mode: `finish`; the baton remains `status: ready` for the next agent.
- Validation: `npm run lint:ci` PASS; `npm run typecheck` PASS.
- Existing failures: `npm run validate:content` is blocked by a pre-existing Notion backup MDX whose frontmatter id does not match its filename; full unit tests remain at 149 passed / 4 failed in the existing export list and metadata contracts.
- No source or generated content was changed during this finish pass.
- Follow-up: final Wiki reflection and PR review are still requested by the handoff contract; do not claim either was completed unless performed.

## Current fix checkpoint (2026-08-11)

- Fixed the live Notion journal quarantine caused by `slug` arriving as a `select` property while the schema allowed only `rich_text | title`.
- Changed `scripts/notion/connect/schema-contract.mjs` and added a regression test in `tests/notion/schema-contract.test.mjs`.
- Verification: targeted Notion tests 28/28, lint, and typecheck passed. Live fetch passed journal schema validation and reached the independent missing-thumbnail contract. Full unit tests remain 150 passed / 4 pre-existing export failures; content validation remains blocked by the existing backup-MDX filename/id mismatch.
- Debug artifacts were removed. Next agent: inspect the two changed Notion files, then handle final Wiki/PR-review follow-up if required.

# Session Handoff

> 이 파일은 에이전트 간 baton입니다. 작업 중 `status`, `updated_at`, 아래 내용을 갱신하세요.
> `status`는 `empty`, `active`, `blocked`, `ready` 중 하나를 사용합니다.

## Current status

- 진행 중인 작업: 없음. RAG Wiki 리밸런싱, indexing worklog, escaped legacy table 복구를 완료했습니다.
- 마지막으로 완료한 작업: strict allowlist table normalizer의 MDX expression·fenced-code 경계를 보강하고 최종 5-lane 재검토를 통과했습니다.
- 현재 branch/upstream: `main` / `origin/main`.
- 현재 Git 상태: 기능 변경과 세션 기록을 4개 commit으로 분리해 `origin/main`에 push했습니다.
- 성공 조건: 완료. RAG registry/index/worklog와 table 복구가 전체 테스트·build/export·반응형 시각 검증을 통과했습니다.
- 다음 작업: 없음. 다음 에이전트는 clean worktree와 `origin/main` 동기화 상태를 확인합니다.

## Git delivery checkpoint (2026-08-13)

- `5e44b21 [ADD] : LLM RAG 인덱싱 및 개발 실행 설정 추가`
- `3b9353f [UPDATE] : 홈 일지 연결 및 통합 검색 화면 추가`
- `2545205 [BUGFIX] : Notion 테이블 태그 렌더링 복구`
- `8d8d253 [UPDATE] : 세션 메모리 및 검증 산출물 갱신`
- 사용자 지정 `[TYPE] : 한글 요약` 정책을 적용했으며, 기능·RAG·버그 수정 범위로 분리했습니다.
- `npm run verify` PASS (26 files/173 tests), `npm run validate:export` PASS (95 routes/0 blockers) 후 `55dd6c7..8d8d253 main -> main` push를 확인했습니다.
- 원격은 새 GitHub 저장소 URL 안내와 main PR 규칙 우회 메시지를 반환했지만 push 자체는 성공했습니다.

## Changed features

- 홈의 일지 카테고리 카드와 일지 선택 상태의 `모든 글 보기`가 `/journal`의 `전체` 탭으로 이동합니다.
- `/tags`에서 프로젝트, Devlog, 개인일지, 교육일지를 태그·검색어·콘텐츠 범위로 통합 검색합니다.
- 홈 인기 태그와 전체 태그 dialog가 `/tags?tag=...`로 연결되며, `/tags`는 sitemap과 SEO metadata에 포함됩니다.
- Navbar의 `/tags` 메뉴 표시는 `Search`이며 전체 메뉴 중 마지막에 위치합니다.
- `npm run dev`, `dev:no-fetch`, `preview`와 Playwright/Lighthouse 기본 주소를 3001 포트로 통일했습니다.
- 주요 변경 파일: `src/app/HomePageClient.tsx`, `src/app/tags/*`, `src/lib/tag-search.ts`, `src/app/globals.css`, `src/components/layout/Navbar.tsx`, `src/app/sitemap.ts`, `src/lib/seo/routes.ts`, `package.json`, `playwright.config.ts`, 관련 e2e와 README.
- RAG 문서 분류는 `project/wiki/rag/source-registry.json`, 생성 인덱스는 `project/wiki/rag/document-index.json`, 실행 이력은 `project/wiki/worklogs/indexing.jsonl`이 소유합니다.

## Commit policy (user-owned)

- 커밋과 push는 사용자가 명시적으로 요청한 경우에만 실행합니다.
- 사용자 기능 변경의 commit message는 저장소에서 사용 중인 사용자 지정 형식인 `[TYPE] : 한글 요약`을 사용합니다. Conventional Commit 형식(`feat:`, `fix:`, `chore:`)으로 대체하지 않습니다.
- 허용 TYPE과 용도: `[ADD]` 신규 기능·문서, `[UPDATE]` 기존 기능 변경·통합, `[FIX]` 일반 수정, `[BUGFIX]` 명확한 버그 수정, `[FETCH]` Notion/API 동기화·수집 변경.
- 현재 변경 묶음의 권장 메시지는 `[UPDATE] : 홈 일지·통합 검색 및 개발 포트 개선`입니다. 실제 커밋 전 diff를 다시 읽고 atomic scope에 따라 분리할 수 있습니다.
- 기능 커밋에는 요청 범위 파일만 path 단위로 stage하고, 관련 없는 dirty worktree는 stage·수정·삭제하지 않습니다.
- `session-end` hook의 `chore(agent): ...` 자동 memory commit은 사용자 기능 commit 정책과 다릅니다. 앞으로 이 세션의 handoff 정리에서는 `commit: false`로 hook을 호출하고, Wiki/handoff 변경도 다음 사용자 승인 커밋에 사용자 지정 형식으로 포함합니다.
- 이미 생성된 `5f5761a`, `55dd6c7` memory commit은 사용자가 history rewrite를 요청하지 않는 한 수정하지 않습니다.

## Remaining tasks

- [x] 현재 홈/목록 라우팅과 인덱스 구조를 기준으로 태그 검색 공용 데이터와 `/tags` UI 구현
- [x] lint/typecheck/unit/build 및 브라우저에서 홈 일지 링크와 태그 검색 동작 검증
- [x] canonical/evidence/worklog 권위와 검색 모드를 source registry로 분리
- [x] 결정적 RAG document index와 append-only indexing worklog 구현
- [x] stale index gate, 중복 소유권, 분류, diff worklog 계약 테스트 및 전체 gate 검증
- [x] 10개 legacy escaped table을 실제 `NotionTable`로 복구하고 future Notion fetch 변환 경계에 strict allowlist 적용
- [x] raw MDX expression, unknown tag, fenced-code 보존 회귀 테스트와 반응형 light/dark 브라우저 검증

## Escaped table rendering checkpoint (2026-08-12)

- 원인: Notion paragraph rich text에 저장된 legacy HTML/JSX table이 안전 escape되어 `&lt;table...` 텍스트로 렌더링됐습니다.
- `scripts/notion/transfer/legacy-table-normalizer.mjs`를 추가해 `table/thead/tbody/tr/th/td/strong/code/br`만 허용하고 모든 attribute를 제거한 뒤 기존 MDX component mapping에 연결했습니다. 알 수 없는 tag는 변환하지 않고 inert 상태로 유지합니다.
- table text node의 `<`, `{`, `}`를 entity로 유지해 MDX expression 실행을 차단하고, content validation도 `NotionTable` 내부 raw expression을 fail-closed 처리합니다. paired Markdown fence는 보존하며 기존 비정상 unclosed ` ```text` marker만 제거합니다.
- 기존 10개 MDX의 13개 escaped table block을 복구했습니다. 10개 실제 route 모두 `tableCount >= 1`, raw tag 미노출, page horizontal overflow 없음이 확인됐습니다.
- 브라우저: 1280/768/375px, light/dark에서 표와 내부 horizontal scroll을 확인했습니다. 증거는 `artifacts/playwright/table-render/`와 `.omo/evidence/table-render-visual-pass-*.md`입니다.
- 최종 검증: `npm run verify` PASS (26 files/173 tests), `npm run build:local` PASS (100 pages), `npm run validate:export` PASS (95 routes/0 blockers), `git diff --check` PASS, RAG index 31 documents current.
- 최종 recheck 5 lanes(goal/code/security/QA/context) 모두 PASS. LSP는 사용자 선택으로 미설치 상태이며 ESLint와 TypeScript compiler를 사용했습니다.

## RAG Wiki and indexing worklog checkpoint (2026-08-12)

- 기존 Wiki 문서를 이동하지 않고 `agent-harness`, `project-skills`, `project-wiki`, `project-reports`, `project-worklogs`의 권위와 검색 모드를 `project/wiki/rag/source-registry.json`에 명시했습니다.
- `scripts/wiki/build-rag-index.mjs`가 Markdown 제목·heading anchor·SHA-256·source group을 결정적으로 생성하며, 중복 문서 소유권과 stale 인덱스를 실패 처리합니다.
- `project/wiki/worklogs/indexing.jsonl`에 baseline 실행의 registry/index hash, 31개 문서의 그룹별 수, added/updated/removed 경로를 기록했습니다. JSONL 자체는 self-referential stale 상태를 피하기 위해 RAG document index에서 제외합니다.
- 기존 `session-memory.md`와 session-end hook은 호환성을 유지하되 `history-only`로 분류했습니다. reports는 `secondary`, canonical Wiki와 skills는 `default` 검색입니다.
- 검증: `npm run verify` PASS (26 files/164 tests), `npm run build:local` PASS, `npm run validate:export` PASS (95 routes/0 blockers), `npm run wiki:index:check` PASS (31 documents), `git diff --check` PASS.
- LSP는 사용자 선택에 따라 설치되지 않아 실행하지 않았으며, ESLint와 TypeScript compiler가 변경 코드 검증을 대신했습니다. 외부 Kapa workspace/credential/embedding 설정은 저장소에 없어 로컬에서 확인할 수 없습니다.

## Tag search and dev port checkpoint (2026-08-12)

- 홈의 일지 카테고리 링크와 모든 글 보기 링크가 `/journal` 전체 목록으로 이동하도록 수정했습니다.
- 프로젝트, Devlog, 개인일지, 교육일지 인덱스를 통합하는 `/tags` 태그 검색 페이지를 추가하고, Navbar·홈 인기 태그·sitemap에 연결했습니다. 태그 선택, 텍스트 검색, 콘텐츠 범위 필터를 지원합니다.
- 개발 서버와 정적 preview 기본 포트를 3000에서 3001로 변경하고 Playwright·Lighthouse 기본 URL과 README를 맞췄습니다.
- 검증: `npm run typecheck`, `npm run lint:ci`, `npm run test:unit -- --run` (25 files/160 tests), `npm run build:local`, `git diff --check` PASS.
- 브라우저 검증: port 3001에서 1280/768/375px 모두 홈 `/journal` 링크, `/tags?tag=LLM` 1건, 프로젝트 필터 8건, Spring 검색 20건, 수평 overflow 없음 확인. 증거: `artifacts/playwright/tag-search/final-1280.png`, `final-768.png`, `final-375.png`.
- 독립 visual QA pass A/B 모두 PASS. `Andrej Karpathy` 혼합 언어 줄바꿈 문제를 nowrap 처리 후 재검증했습니다.

## Search menu and preview CSS checkpoint (2026-08-12)

- Navbar의 `/tags` 메뉴명을 `Search`로 변경하고 메뉴 배열의 마지막으로 이동했습니다.
- 3001 preview를 새 빌드로 재생성하고 기존 stale 서버 프로세스를 종료한 뒤 재시작했습니다. `/tags` CSS가 정상 로드되어 1280/768/375px에서 3/2/1열 카드와 수평 overflow 없음이 확인되었습니다.
- 검증: `npm run build:local`, `npm run typecheck`, `npm run lint:ci`, `git diff --check` PASS. Playwright on `http://localhost:3001/tags`: Search 마지막 메뉴, 86 cards, 1280/768/375 반응형 PASS.

- [x] 새 skill frontmatter/YAML과 관련 gate를 검증합니다.
- [x] 전역 skill `C:/Users/rlagu/.codex/skills/session-handoff-workflow`를 등록하고 metadata를 검증합니다.
- [x] 최종 Wiki에 handoff의 결정·검증·위험을 반영합니다.
- [x] 변경 diff와 검증 증거에 대해 PR review를 요청합니다.

## Remaining-error resolution checkpoint (2026-08-11)

- Root causes fixed: journal `slug` select schema quarantine, missing live devlog thumbnails, staging omission of public assets, rollback snapshots leaking into content/index generators, placeholder descriptions for empty Notion descriptions, and uppercase generated slugs.
- Generated assets retained: `public/thumnail/devlog/tech_study/3b819946ca7680439eecd5fe23528952.webp` and `public/thumnail/devlog/tech_study/3b919946ca7680d9a4f3c5389ea08e85.webp`.
- Verification: `npm run fetch-notion -- --force` PASS; `npm run build:local` PASS with temporary non-secret `GISCUS_INFO` using the expected canonical URL; `npm run validate:export` PASS (95 routes, 0 blockers); `npm run validate:content` PASS (87 files); `npm run lint:ci` PASS; `npm run typecheck` PASS; `npm run test:unit -- --run` PASS (25 files, 157 tests).
- Manual artifact QA: root canonical, latest devlog/project list entries, project detail title, and absence of placeholder description verified from fresh `out/` HTML.
- Remaining follow-up requested by the handoff contract: final Wiki reflection and PR review. No secrets were recorded.

## Thumbnail style repair checkpoint (2026-08-11)

- Compared the two generated thumbnails with existing `tech_study` references. The prior assets were dark neon full-bleed renders and violated the canonical bright graph-paper, navy/cobalt flat-isometric style.
- Replaced both stable-ID assets using style-referenced image generation and WebP conversion at 576x384: `3b819946ca7680439eecd5fe23528952.webp`, `3b919946ca7680d9a4f3c5389ea08e85.webp`.
- Fresh visual inspection shows pale grid backgrounds, centered subjects, navy/cobalt palette, no watermark or readable text, and consistent card-scale composition.
- Independent visual QA reviewers both returned PASS. Evidence: `.omo/evidence/thumbnail-visual-style-and-contract-gate-review.md` and `.omo/evidence/thumbnail-crop-small-card-fidelity-gate-review.md`.
- Verification: thumbnail contract 2/2, content 87 files, lint, typecheck, unit 25 files/157 tests, build, and export 95 routes/0 blockers all PASS.

## Review repair checkpoint (2026-08-12)

- Fixed committed-crash recovery in `scripts/notion/connect/content-transaction.mjs` so all transaction backups are removed after verified commit recovery.
- Fixed malformed or empty existing content locks in `scripts/notion/connect/content-lock.mjs` to fail closed instead of replacing ownership metadata.
- Added regressions for backup cleanup and malformed-lock rejection.
- Verification: `npx vitest run tests/notion/content-transaction.test.mjs tests/notion/fetch-orchestration.test.mjs` PASS (2 files, 28 tests).
- Previous review was blocked by these two runtime findings and by a missing dependency install in its isolated worktree; a fresh five-lane review is required on the updated snapshot.
- Remaining risk: `npm audit --omit=dev` reports four pre-existing high-severity production dependency findings (`next`, `sharp`, `postcss`, `js-yaml`); no dependency upgrade was made in this scoped repair.
- Final validation: lint, typecheck, unit 25 files/158 tests, content 87 files, export 95 routes/0 blockers, targeted Notion 28 tests, and thumbnail contract all PASS.
- Review report: `project/wiki/reports/notion-thumbnail-repair-review-2026-08-12.md`. The fresh five-lane review remains not approved because the Windows-isolated snapshot was incomplete; its findings are recorded as review infrastructure failure, not as a claim against the current main worktree.

## TOC design checkpoint (2026-08-12)

- Changed `src/app/globals.css` so the first article `## 목차` renders as a visible bordered right rail on desktop and a bounded full-width scroll panel below 768px.
- Added semantic hover and keyboard focus treatment without changing generated MDX content.
- Updated `DESIGN.md` to record the article table-of-contents rail as a reusable primitive and its responsive behavior.
- Verification: `npm run build:local`, `npm run lint:ci`, and `npm run typecheck` PASS; focused tests 2 files/5 tests PASS. Playwright captured 1280, 768, and 375px plus focused-link state. Two fresh visual QA reviewers returned PASS.
- Evidence report: `project/wiki/reports/toc-design-review-2026-08-12.md`; full e2e suite timed out due preview port contention, while the requested route was directly verified on the running preview.

## TOC top-only checkpoint (2026-08-12)

- Applied user-approved direction: the article table of contents no longer floats to the side and stays at the top of the article.
- Set the TOC heading/list to `display: table`, `width: fit-content`, and `max-width: 100%`; preserved bounded scrolling and focus-visible styling.
- Verification: `npm run lint:ci`, `npm run typecheck`, and `npm run build:local` PASS. Playwright final captures: 1280px TOC width 387.8px, 375px TOC width 301px; both remain in viewport. Two fresh visual QA reviewers returned PASS.
- Evidence: `artifacts/playwright/top-desktop.png`, `artifacts/playwright/top-mobile.png`, and `project/wiki/reports/toc-design-review-2026-08-12.md`.

## TOC collapse checkpoint (2026-08-12)

- Added a rehype transform that converts the first article TOC heading/list into native `<details open>` and `<summary>` markup for server-rendered initial expansion and keyboard-accessible collapse/expand behavior.
- Updated `src/app/globals.css` so the top-only TOC uses approximately two-thirds of the article content width on desktop, becomes full-width below 768px, and includes open/closed chevron, focus-visible, bounded scrolling, and reduced-motion states.
- Verification: `npm run lint:ci`, `npm run typecheck`, `npm run build:local`, and `git diff --check` PASS. Playwright verified 1280/768/375px layout, no horizontal overflow, initial open, collapse/reopen, focus, and mobile screenshots.
- Independent fresh visual QA reviewers A and B both returned PASS. Evidence: `.omo/evidence/toc-collapse-final-fresh-review-a-gate-review.md`, `.omo/evidence/toc-collapse-fresh-review-b-gate-review.md`, and `artifacts/playwright/toc-collapse/`.
- Changed files: `src/lib/content/rehype-article-toc.ts`, `src/app/devlog/[category]/[slug]/page.tsx`, `src/app/projects/[id]/page.tsx`, `src/app/globals.css`, `DESIGN.md`.

## Checkout checkpoint (2026-08-12)

- Baton checked out by the current agent; no new user task was supplied beyond session handoff.
- The completed TOC disclosure change remains as uncommitted user work. Preserve it and inspect the existing diff before follow-up edits.
- Next action: continue the user's next request, or run the finish workflow when handing off again.

## Project child-page tabs checkpoint (2026-08-12)

- Implemented Notion `child_page` traversal in `scripts/notion/transfer/notion-blocks-to-mdx.mjs`; child page content is emitted as `ProjectTab` entries and grouped by `ProjectTabs`, while child headings stay out of the parent TOC.
- Registered `notion-project-tabs` and `notion-project-tab` mappings and added the accessible client component at `src/components/ui/ProjectTabs.tsx`. The first tab is initially active; click, ArrowLeft/ArrowRight, Home, and End navigation are supported with roving tab indices and `aria-labelledby` panel linkage.
- Wired project MDX components and responsive styling in `src/app/projects/[id]/page.tsx` and `src/app/globals.css`; legacy JSON tabs remain supported.
- Verification: `npm run validate:content` PASS (87 files); `npm run lint:ci` PASS; `npm run typecheck` PASS; `npm run test:unit -- --run` PASS (25 files, 159 tests); `npm run build:local` PASS; `git diff --check` PASS with only existing CRLF normalization warnings.
- Browser evidence: `artifacts/playwright/project-tabs/1280.png`, `768.png`, and `375.png`; initial tab, click switch, keyboard switch, and no horizontal overflow were observed. Independent gate review A approved; review B identified missing `aria-labelledby`, which was fixed and revalidated by lint/typecheck/build.
- Temporary MDX fixture was removed before the final build. No secrets or unrelated source content were added.

## Existing flattened project migration checkpoint (2026-08-12)

- Migrated the existing project source `src/content/projects/enterprise/general/3b119946ca768045ae69ff18b3657552.mdx`, where two Notion child pages had previously been flattened into headings, into two direct `ProjectTab` entries.
- Removed the stale child-page entries from that page's static TOC so only the parent tab's section headings remain visible in the TOC.
- Browser verification on `/projects/e`: two tabs rendered, first tab initially selected, second tab switched correctly, `aria-labelledby` matched the active panel, and no horizontal overflow occurred.
- Final verification after migration: `npm run validate:content`, `npm run lint:ci`, `npm run typecheck`, `npm run build:local`, and `git diff --check` all passed.

## Standalone fetch and project TOC checkpoint (2026-08-12)

- Fixed `scripts/notion/connect/fetch.mjs` to resolve the repository root from `import.meta.url`, so standalone execution outside the repository cwd loads `.env.local.yml` and no longer fails with missing `journal` configuration.
- Added regression coverage in `tests/notion/source-config.test.mjs`; parent-directory execution with `CI=true` now reports configured journal/devlog/project groups.
- Moved project TOC markup inside `ProjectTabs`, made `ProjectTabs` render the nested heading/list as the same collapsible `.article-toc` used by other articles, and broadened the CSS selector for nested placement.
- Updated the rehype TOC traversal to support nested content trees. Browser QA on `/projects/e` verified TOC inside the active tab panel, initially open, collapsible, matching width (`693.328125px` at 1280px), tab switching, and no horizontal overflow.
- Verification: targeted Notion tests 26/26 then 19/19; full unit tests 25 files/160 tests; content validation, lint, typecheck, build, and diff check passed. Evidence: `artifacts/playwright/project-tabs/project-e-toc.png`.

## Verification

- 최신 실행 결과: `npm run build:local` PASS; `npm run typecheck` PASS; `npm run lint:ci` PASS; `npm run test:unit -- --run` PASS (25 files, 160 tests); `git diff --check` PASS.
- 브라우저: `http://localhost:3001/tags`에서 1280/768/375px 모두 Search 메뉴가 마지막, 86개 결과, 3/2/1열 grid, 수평 overflow 없음 확인.
- 검색 동작: `LLM` 태그 1건, 프로젝트 범위 8건, `Spring` 검색 20건 확인. 홈 일지 링크는 `/journal` 확인.
- visual QA: 최종 독립 reviewer A/B 모두 PASS. 증거는 `artifacts/playwright/tag-search/`와 `.omo/evidence/tag-search-visual-qa-*-gate-review.md`에 있습니다.

## Risks and decisions

- 3001 포트에 오래된 dev/preview 프로세스가 남아 있으면 stale chunk를 제공할 수 있습니다. 화면이 이전 상태이면 해당 프로세스를 종료하고 `npm run build:local` 후 `npm run preview` 또는 `npm run dev:no-fetch`로 재시작합니다.
- `/tags` 기본 결과는 현재 86건이라 페이지가 길지만 검색·태그·범위 필터와 3/2/1열 반응형 grid로 탐색할 수 있습니다.
- 이 문장은 이전 태그 검색 checkpoint 당시의 ready 기록입니다. 현재 baton 상태는 파일 상단 YAML과 `Current status`를 권위 있는 값으로 사용합니다.

## Next agent

다음 에이전트는 먼저 `git status --short`와 이 파일의 `Commit policy (user-owned)`를 확인합니다. 사용자가 commit/push를 요청하지 않았다면 Git history를 변경하지 않습니다. 요청받은 경우 사용자 지정 `[TYPE] : 한글 요약` 형식과 요청 범위 staging을 적용합니다.
