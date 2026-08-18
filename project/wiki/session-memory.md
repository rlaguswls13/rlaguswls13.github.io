# Session Memory

세션 종료 hook이 구조화된 결정·검증·위험을 아래에 append한다. 수동으로 원문 token이나 PII를 추가하지 않는다.

## 2026-08-11T06:45:55.263Z | ulw-20260811-153932

### Summary
AGENTS.md? Kappa LLM RAG ???? agent ?? ??? ?????. metadata, retrieval cues, canonical surface, skill routing, verification gates, safety contract, session memory? ????.

### Decisions
- AGENTS.md? ?? agent entrypoint? ???? project/wiki? ?? canonical source? ??
- Kappa ?? schema? ?? ???? Markdown comment metadata? ???? heading chunk? ??

### Verification
- docs-surface targeted: PASS 2/2
- lint:ci: PASS
- typecheck: PASS
- unit: 147 passed, 4 pre-existing export failures
- validate:content: pre-existing backup filename/frontmatter ID mismatch
- build:local: blocked by missing GISCUS_INFO
- validate:export: 2 pre-existing blockers

### Risks
- Kappa ingestion ??? ?? ???? ?? ?? ??
- ?? content/export gate failures remain

### Changed project surfaces
- `AGENTS.md`

## 2026-08-11T06:48:51.920Z | ulw-20260811-153932-kapa-audit

### Summary
?? Kapa guidance? ??? AGENTS.md? ????. visible metadata, descriptive section headings, Q&A retrieval units, citation/source-group ??, ?? ?? ? ??? ? ?? guardrail? ????.

### Decisions
- HTML comment metadata??? ??? ???? ?? visible Markdown table? source of truth? ??
- Kapa ????? ?? Q&A? citation ??? ???? ??? ?? ingestion schema? ???? ??

### Verification
- docs-surface targeted: PASS 2/2
- lint:ci: PASS
- git diff --check: PASS
- RAG structure inspection: PASS

### Risks
- Kapa workspace? ?? source-group ???? ?? ???? ?? ?? ??
- ?? content/export gate failures remain from prior audit

### Changed project surfaces
- `AGENTS.md`

## 2026-08-11T08:39:17.534Z | handoff-contract-20260811

### Summary
?? .agent/session-handoff.md ??? session-end hook ??? ????. ?? baton? handoff? ?? ?? Wiki? PR review? ???? ??.

### Decisions
- handoff status? empty, active, blocked, ready? ??
- ??? handoff? requestFinalWiki? requestPrReview? true? ??
- hook? handoff ??? commit?? ?? project memory ??? commit

### Verification
- handoff hook tests: PASS 5/5
- docs-surface: PASS 2/2
- lint:ci: PASS
- typecheck: PASS
- full unit: 149 passed, 4 pre-existing export failures

### Risks
- ?? export fixture 4? ??
- ?? PR/reviewer ??? ?? baton?? ?? ??

### Changed project surfaces
- `AGENTS.md`
- `.agent/session-handoff.md`
- `project/hooks/session-end.mjs`
- `project/hooks/README.md`
- `project/skills/session-memory-wiki/SKILL.md`
- `tests/project/session-end-hook.test.mjs`

## 2026-08-11T08:59:44.011Z | session-handoff-skill-20260811

### Summary
???? ?? session-handoff-workflow skill? ????. start/checkpoint/continue/finish ??? ?? .agent/session-handoff.md? ?? ????, finish? Wiki? PR review ??? hook ??? ????.

### Decisions
- ??? ??? custom skill ?? project/skills/session-handoff-workflow ?? skill? ??
- ?? ?? ??? handoff ??? ?? start/continue/finish? ??
- Python init_skill.py? ?? ?? SKILL.md? agents/openai.yaml? ?? ??

### Verification
- skill structure: PASS
- handoff hook tests: PASS 5/5
- lint:ci: PASS
- typecheck: PASS
- git diff --check: PASS
- full unit baseline: 149 passed, 4 pre-existing export failures

### Risks
- host? project/skills? ?? skill ??? ???? ?? ?? AGENTS.md ?? ??? fallback
- ?? export fixture 4? ??

### Changed project surfaces
- `AGENTS.md`
- `.agent/session-handoff.md`
- `project/skills/session-handoff-workflow/SKILL.md`
- `project/skills/session-handoff-workflow/agents/openai.yaml`

## 2026-08-11T09:13:26.311Z | global-session-handoff-registration

### Summary
Registered the global session-handoff-workflow skill and applied it to this session.

### Decisions
- Keep repository project skill as the canonical workflow and use the global skill as the compact router.

### Verification
- Global SKILL.md frontmatter: PASS
- agents/openai.yaml metadata: PASS
- targeted session hook tests: PASS 7/7

### Risks
- Python init_skill.py could not run because only the Microsoft Store Python stub is available; files were created using the required template shape.

### Changed project surfaces
- `.agent/session-handoff.md`
- `C:/Users/rlagu/.codex/skills/session-handoff-workflow`

## 2026-08-11T09:15:50.867Z | codex-2026-08-11-handoff

### Summary
Finished session handoff validation; baton remains ready with existing validation failures recorded.

### Verification
- npm run lint:ci: PASS
- npm run typecheck: PASS
- npm run validate:content: FAIL: pre-existing backup MDX frontmatter id mismatch
- npm run test:unit -- --run: FAIL: 149 passed, 4 existing export contract failures

### Risks
- Existing content and export contract failures remain unresolved.

### Changed project surfaces
- `.agent/session-handoff.md`

## 2026-08-11T09:30:26.375Z | codex-2026-08-11-notion-journal-schema

### Summary
Fixed journal Notion schema quarantine: live slug properties are select, now accepted by the schema with regression coverage.

### Verification
- npx vitest run tests/notion/schema-contract.test.mjs tests/notion/fetch-orchestration.test.mjs tests/notion/source-config.test.mjs: PASS 28/28
- npm run lint:ci: PASS
- npm run typecheck: PASS
- npm run fetch-notion: journal schema passed; later stopped at independent missing-thumbnail contract
- npm run test:unit -- --run: 150 passed, 4 pre-existing export failures
- npm run validate:content: pre-existing backup MDX filename/id mismatch

### Risks
- Live fetch still requires missing thumbnails for downstream content; existing export/content failures remain.

### Changed project surfaces
- `scripts/notion/connect/schema-contract.mjs`
- `tests/notion/schema-contract.test.mjs`
- `.agent/session-handoff.md`

## 2026-08-11T10:03:23.497Z | local

### Summary
Resolved Notion journal select-slug quarantine, missing thumbnails, staging asset omission, rollback residue, placeholder metadata, and slug normalization. Full fetch/build/export/content/lint/typecheck/unit gates pass.

### Decisions
- Accept select as a valid Notion journal slug property type.
- Ignore generated rollback snapshots in content and index generators.
- Use page title as description fallback and normalize generated slugs to lowercase.

### Verification
- npm run fetch-notion -- --force: PASS
- npm run build:local with temporary non-secret GISCUS_INFO: PASS
- npm run validate:export: PASS, 95 routes, 0 blockers
- npm run validate:content: PASS, 87 files
- npm run lint:ci: PASS
- npm run typecheck: PASS
- npm run test:unit -- --run: PASS, 25 files, 157 tests
- manual fresh out HTML checks: PASS

### Risks
- build:local requires GISCUS_INFO in the local environment; verification used a temporary non-secret value with the expected canonical URL
- final Wiki reflection and PR review remain requested by the handoff contract

### Changed project surfaces
- `scripts/notion/connect/schema-contract.mjs`
- `scripts/notion/connect/sync-pages.mjs`
- `scripts/notion/connect/content-transaction.mjs`
- `scripts/notion/connect/fetch-orchestration.mjs`
- `scripts/notion/transfer/build-journal-index.mjs`
- `scripts/notion/transfer/build-devlog-index.mjs`
- `scripts/notion/transfer/build-project-index.mjs`
- `scripts/slug/generate.mjs`
- `tests/notion/schema-contract.test.mjs`
- `tests/notion/content-transaction.test.mjs`
- `tests/notion/fetch-orchestration.test.mjs`
- `tests/content/validation.test.mjs`
- `tests/fixtures/list-html.mjs`
- `public/thumnail/devlog/tech_study/3b819946ca7680439eecd5fe23528952.webp`
- `public/thumnail/devlog/tech_study/3b919946ca7680d9a4f3c5389ea08e85.webp`

## 2026-08-11T10:27:14.971Z | local

### Summary
Replaced two dark neon devlog thumbnails with bright graph-paper navy/cobalt thumbnails matching existing style.

### Decisions
- Use existing thumbnails as style references for generated replacements.
- Keep stable Notion-ID filenames and 576x384 WebP RGB output.

### Verification
- thumbnail contract: PASS, 2/2
- validate:content: PASS, 87 files
- lint:ci: PASS
- typecheck: PASS
- unit: PASS, 25 files and 157 tests
- build:local: PASS with temporary non-secret GISCUS_INFO
- validate:export: PASS, 95 routes and 0 blockers
- independent visual QA reviewer A: PASS

### Risks
- Generated images are intentionally newly illustrated but now follow the established thumbnail visual language.

### Changed project surfaces
- `public/thumnail/devlog/tech_study/3b819946ca7680439eecd5fe23528952.webp`
- `public/thumnail/devlog/tech_study/3b919946ca7680d9a4f3c5389ea08e85.webp`
- `.agent/session-handoff.md`

## 2026-08-11T15:53:52.511Z | toc-design-2026-08-12

### Summary
목차 UI를 사용자 기준 이미지에 맞춰 읽기 rail로 개선하고 fresh visual QA를 완료했습니다.

### Decisions
- desktop에서는 우측 rail, 768px 이하에서는 bounded stacked panel을 사용했습니다.
- 생성 MDX는 변경하지 않고 DESIGN.md에 primitive와 반응형 계약을 기록했습니다.

### Verification
- npm run build:local PASS
- npm run lint:ci PASS
- npm run typecheck PASS
- focused Vitest 2 files / 5 tests PASS
- Playwright 1280/768/375px 및 focus 캡처 PASS
- fresh visual QA 2개 레인 PASS

### Risks
- 전체 npm run test:e2e는 preview port contention으로 300초 timeout; 요청 route는 직접 Playwright로 검증했습니다.

### Changed project surfaces
- `src/app/globals.css`
- `DESIGN.md`
- `project/wiki/reports/toc-design-review-2026-08-12.md`
- `.agent/session-handoff.md`

## 2026-08-11T16:13:45.514Z | toc-top-only-2026-08-12

### Summary
사용자 확인에 따라 목차를 본문 상단으로 이동하고 콘텐츠 폭에 맞는 박스로 조정했습니다.

### Decisions
- 사이드 rail을 제거하고 top-only를 적용했습니다.
- fit-content와 max-width 100%로 내용 기반 폭과 모바일 안전성을 함께 유지했습니다.

### Verification
- npm run lint:ci PASS
- npm run typecheck PASS
- npm run build:local PASS
- Playwright 1280/375px 캡처 및 geometry PASS
- fresh visual QA 2개 레인 PASS

### Risks
- 전체 e2e 명령은 preview port contention으로 timeout됐지만 요청 페이지는 직접 검증했습니다.

### Changed project surfaces
- `src/app/globals.css`
- `DESIGN.md`
- `project/wiki/reports/toc-design-review-2026-08-12.md`
- `.agent/session-handoff.md`

## 2026-08-11T16:16:31.365Z | finish-sync-2026-08-12

### Summary
세션 handoff를 finish 처리하고 Notion 콘텐츠·썸네일·top-only 목차 변경을 커밋 및 origin/main에 동기화했습니다.

### Decisions
- 기존 사용자 변경을 보존한 상태에서 현재 누적 변경을 하나의 동기화 커밋으로 반영했습니다.
- handoff status를 ready로 유지하고 Wiki 검증 보고서를 보존했습니다.

### Verification
- npm run validate:content PASS
- npm run test:unit -- --run PASS, 25 files / 158 tests
- npm run validate:export PASS, 95 routes / 0 blockers
- npm run lint:ci PASS
- npm run typecheck PASS
- npm run build:local PASS
- git push origin main PASS

### Risks
- git diff --check는 생성 MDX의 기존 trailing whitespace와 EOF blank line을 보고했으며 콘텐츠 의미 변경 없이 보존했습니다.
- npm audit --omit=dev의 기존 high 4건은 별도 의존성 작업으로 남겼습니다.

### Changed project surfaces
- `.agent/session-handoff.md`
- `src/app/globals.css`
- `scripts/notion/connect/content-lock.mjs`
- `scripts/notion/connect/content-transaction.mjs`
- `DESIGN.md`
- `project/wiki/reports/toc-design-review-2026-08-12.md`

## 2026-08-12T06:38:50.322Z | project-tabs-fetch-2026-08-12

### Summary
???? ?? ??? ?? ? ?? ??? ???? ?? Notion fetch? ??? ?? ??? ??????.

### Decisions
- Notion fetch? ??? ??? process.cwd()? ??? fetch.mjs ???? ?????.
- ???? child page? ProjectTabs? ?? ??? ?? ? ?? ?? ?????.

### Verification
- npm run validate:content PASS
- npm run lint:ci PASS
- npm run typecheck PASS
- npm run test:unit -- --run PASS: 25 files, 160 tests
- npm run build:local PASS
- Playwright /projects/e PASS: ?? ?? open, collapse, ? ??, horizontal overflow ??
- git push origin main PASS: 49fb5b8

### Risks
- ?? PR review? ??? ???? ?????.

### Changed project surfaces
- `scripts/notion/connect/fetch.mjs`
- `scripts/notion/transfer/notion-blocks-to-mdx.mjs`
- `src/components/ui/ProjectTabs.tsx`
- `src/lib/content/rehype-article-toc.ts`
- `src/app/globals.css`
- `tests/notion/source-config.test.mjs`
- `tests/notion/content-security.test.mjs`

## 2026-08-12T07:23:09.244Z | local

### Summary
홈 일지 링크를 /journal 전체 목록으로 수정하고 /tags 통합 태그 검색을 추가했으며 개발/preview 기본 포트를 3001로 변경했습니다.

### Decisions
- 태그 검색 범위는 프로젝트·Devlog·개인일지·교육일지 인덱스 전체로 통합
- 개발 서버와 정적 preview 기본 포트는 3001 사용

### Risks
- 전체 태그 결과가 86건으로 길어질 수 있으나 반응형 3/2/1 grid와 검색·범위 필터로 탐색 가능

## 2026-08-12T07:40:13.167Z | local

### Summary
Search 메뉴를 마지막으로 이동하고 3001 preview의 stale 산출물을 새 빌드로 갱신했습니다.

### Decisions
- 메뉴명은 Search, 기존 URL은 /tags 유지
- 개발/preview 포트는 3001 유지

### Risks
- 기존 3001 서버가 이전 산출물을 캐시하면 재시작 필요

## 2026-08-12T07:43:18.684Z | search-handoff-2026-08-12

### Summary
홈 일지 전체 연결, 전 콘텐츠 통합 Search, 3001 포트 전환과 Search 메뉴 마지막 배치를 완료했다. 사용자 지정 commit 정책은 [TYPE] : 한글 요약이며 명시적 요청 전에는 commit/push하지 않는다.

### Decisions
- 사용자 기능 commit은 [ADD|UPDATE|FIX|BUGFIX|FETCH] : 한글 요약 형식 사용
- session-end 자동 chore(agent) commit은 사용하지 않고 commit false로 호출
- 관련 없는 dirty worktree를 stage하지 않음

### Risks
- 3001에 stale 프로세스가 남으면 새 빌드 후 재시작 필요
- 기능 변경은 아직 uncommitted and unpushed

## 2026-08-12T09:58:50.647Z | local

### Summary
LLM RAG Wiki source registry와 deterministic document index, append-only indexing worklog를 추가하고 legacy escaped table 렌더링을 안전하게 복구함

### Decisions
- canonical/secondary/history-only 검색 경계를 source registry로 관리
- legacy table은 strict allowlist와 text-node MDX escaping을 거쳐 NotionTable로 변환
- 커밋은 사용자 요청 전까지 수행하지 않음

### Verification
- npm run verify: 26 files/173 tests PASS
- npm run build:local: 100 pages PASS
- npm run validate:export: 95 routes/0 blockers PASS
- 10 repaired routes responsive/light/dark browser QA PASS
- five-lane final recheck PASS

### Risks
- external Kapa workspace/embedding integration is outside repository and was not verified
- Tomcat legacy source already contained placeholder code-popup text; table rendering is fixed without reconstructing missing source text

### Changed project surfaces
- `project/wiki/rag/`
- `project/wiki/worklogs/`
- `scripts/wiki/build-rag-index.mjs`
- `scripts/notion/transfer/legacy-table-normalizer.mjs`
- `scripts/notion/transfer/notion-blocks-to-mdx.mjs`
- `scripts/content/content-contract.mjs`
- `src/content/devlog/**/*.mdx`
- `tests/notion/content-security.test.mjs`
- `tests/content/validation.test.mjs`

## 2026-08-13T05:48:47.579Z | runtime-error-2026-08-13

### Summary
Resolved local startup EADDRINUSE by identifying and terminating the stale static preview process that owned port 3001. No source code was changed.

### Decisions
- Preserved all pre-existing dirty worktree changes and applied an operational process cleanup only.
- Left port 3001 free after QA so the next npm run dev:no-fetch starts cleanly.

### Verification
- npm run dev:no-fetch: red EADDRINUSE before cleanup, green Ready in 562ms after cleanup.
- Playwright Chrome home smoke: 1 passed.
- npm run verify: PASS, 26 files and 173 tests.
- npm run build:local: PASS.
- npm run validate:export: PASS, 95 routes and 0 blockers.

### Risks
- Using 127.0.0.1 rather than localhost during dev triggers a non-fatal Next.js allowedDevOrigins HMR warning.

### Changed project surfaces
- `.agent/session-handoff.md`
- `project/wiki/session-memory.md`

## 2026-08-13T11:25:59.205Z | resume-audit-2026-08-13

### Summary
Resumed the repository baton and confirmed the prior runtime-error resolution is complete; no source or generated content changes were required.

### Decisions
- Treat the ready baton, synced main branch, and existing durable memory as authoritative; do not duplicate completed implementation work.
- No PR reviewable source diff exists in the resumed worktree.

### Verification
- git status --short: only unrelated untracked .omc tool state
- origin/main...HEAD: 0 0
- project/wiki/session-memory.md contains the runtime-error decision and verification record
- port 3001: FREE

### Risks
- Using 127.0.0.1 instead of localhost may still emit the documented non-fatal Next.js allowedDevOrigins warning.

## 2026-08-14T12:27:26.534Z | notion-fetch-diagnosis-2026-08-14

### Summary
Confirmed the repeated Notion fetch CI failure is caused by workflow Secret-name wiring, not the Notion API or content schema.

### Decisions
- Keep canonical data-source configuration unchanged; the next fix should forward the existing page-ID compatibility secrets in the workflow and lock the mapping with the workflow contract test.
- Do not modify GitHub Secrets or production content during diagnosis.

### Verification
- Eight consecutive workflow runs show the identical pre-API journal source-group error.
- Latest run exposes empty NOTION_DATA_SOURCE_ID_* variables while NOTION_TOKEN is present.
- GitHub environment contains NOTION_PAGE_ID_JOURNAL, NOTION_PAGE_ID_DEVLOG, and NOTION_PAGE_ID_PROJECT.
- Local parser toggle: empty current mapping fails; three page-ID inputs configure journal/devlog/project as 1/1/1.

### Risks
- Scheduled Notion content synchronization remains broken until workflow compatibility wiring is fixed and a real Actions run passes.

### Changed project surfaces
- `.agent/session-handoff.md`
- `project/wiki/session-memory.md`

## 2026-08-18T01:13:18.741Z | claude-code-2026-08-18-seo

### Summary
네이버 서치어드바이저/구글 서치 콘솔 가이드에 맞춰 SEO 요소를 점검하고 빠진 부분을 구현했습니다. naver-site-verification meta(env var는 사용자 요청으로 SEARCH_ADVISER_VERIFICATION으로 명명), 모든 페이지 robots meta, og:image/twitter:image(next/og 기반 빌드 시 생성되는 opengraph-image.png, 사용자 제공 blog-cover.jpg 배경 사용), favicon(icon.jpg, 사용자 제공), RSS 2.0 피드(/rss.xml)를 신규 구현했습니다. 기존 sitemap.xml/robots.txt/ads.txt/구조화 데이터/google-site-verification은 이미 구현되어 있어 문서화만 했습니다.

### Decisions
- output: export 환경에서 opengraph-image.tsx 파일 컨벤션이 확장자 없는 파일을 만들어 GitHub Pages가 octet-stream으로 서빙하는 버그(vercel/next.js#82177)를 발견해, 빌드 스크립트에서 직접 .png로 렌더링하는 방식으로 우회함
- twitter:card를 summary에서 summary_large_image로 변경
- 이 저장소의 canonical 문서는 project/wiki·project/skills이므로 SEO 관련 신규 skill(naver-search-advisor-operations)과 문서 갱신은 그쪽에 반영하고 OMC 로컬 wiki(.omc/wiki)는 커밋 대상에서 제외
- RSS 아이템 소스는 devlog-recommendations.json 하나만 사용 (journal 콘텐츠도 devlog blog 카테고리로 이미 발행되어 있어 별도 journal 소스 불필요)

### Verification
- npm run typecheck / lint:ci / validate:content / wiki:index:check 전부 PASS
- npx vitest run 178/179 PASS (나머지 1개는 무관한 기존 deploy-contract.test.ts 실패, 이번 세션에서 발생시키지 않음)
- 실제 next build 후 npm run validate:export PASS (95 routes, 0 blockers)
- out/opengraph-image.png, out/icon.jpg, out/rss.xml 모두 올바른 확장자/내용으로 생성 확인

### Risks
- tests/workflows/deploy-contract.test.ts의 fetch-notion.yml secret 이름 불일치 실패는 이 세션 이전부터 존재하던 무관한 이슈로, 손대지 않았습니다

### Changed project surfaces
- `src/lib/seo/metadata.ts`
- `src/lib/seo/rss.ts`
- `src/app/rss.xml/route.ts`
- `src/app/layout.tsx`
- `src/app/icon.jpg`
- `src/app/robots.ts`
- `scripts/deploy/generate-opengraph-image.mjs`
- `scripts/config/generate-build-resources.mjs`
- `src/lib/giscus-info.ts`
- `scripts/config/giscus-info.mjs`
- `project/skills/naver-search-advisor-operations/SKILL.md`
- `project/skills/google-search-feeds/SKILL.md`
- `project/wiki/operations/guide.md`
- `project/wiki/architecture/tech-stack.md`
- `.github/workflows/deploy.yml`
- `tests/seo/rss.test.ts`
- `tests/config/build-resources.test.mjs`

## 2026-08-18T05:52:53.237Z | notion-status-publish-gate-2026-08-18

### Summary
Notion status(publish/ready/temp) 프로퍼티 기반 게시 제어 기능을 구현했다. temp는 slug/route/인덱스에서 완전히 제외해 URL을 숨기고, ready는 상세 페이지를 수정중 대체화면으로 표시하며, publish는 기존과 동일하게 노출한다.

### Decisions
- Notion 실 컬럼명은 status이므로 코드 필드명도 state가 아닌 status로 통일했다(사용자 피드백 반영).
- sync-pages.mjs는 temp 행도 정상 동기화하되 썸네일 요구만 건너뛴다 — 이미 발행됐다가 나중에 temp로 바뀐 글도 frontmatter가 갱신되어야 하기 때문이다(초기에는 전체 skip으로 잘못 구현했다가 발견/수정).
- content-contract.mjs 검증 계약이 temp 개념을 몰라 전체 fetch가 막혔던 문제를 수정 — temp 항목과 temp로 인해 완전히 비어버린 카테고리를 검증에서 제외하도록 했다.
- state 필드는 output 메타데이터가 실제로는 적용되지 않는 죽은 코드였다는 걸 발견 — row 키는 항상 Notion 원본 속성명을 그대로 쓴다.

### Verification
- npm run fetch-notion -- --force: 성공, temp 10건 정상 제외
- npm run validate:content: PASS (77 files)
- npm run typecheck / lint:ci: PASS
- npx vitest run: 178/179 PASS (무관한 기존 deploy-contract.test.ts 실패 1건 제외)
- npm run build:no-fetch + validate:export: PASS (85 routes, 0 blockers, 95에서 10개 정확히 감소)

### Risks
- content-contract.mjs의 empty-category 허용 완화가 향후 실제로 5개 devlog 카테고리 중 하나가 통째로 비게 되는 다른 버그를 가릴 수 있다 — 필요시 재검토.
- tests/seo/metadata.test.ts의 approvedDescriptionSources, tests/fixtures/list-html.mjs의 firstTitle은 실 콘텐츠 상태를 하드코딩한 핀 값이라 Notion에서 status를 더 바꾸면 다시 깨질 수 있다.

### Changed project surfaces
- `scripts/notion/connect/schema-contract.mjs`
- `scripts/notion/connect/sync-pages.mjs`
- `scripts/notion/transfer/build-devlog-index.mjs`
- `scripts/notion/transfer/build-journal-index.mjs`
- `scripts/notion/transfer/build-project-index.mjs`
- `scripts/recommendations/generate.mjs`
- `scripts/slug/generate.mjs`
- `scripts/content/content-contract.mjs`
- `src/app/devlog/[category]/[slug]/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/components/ui/EditingPlaceholder.tsx`
- `tests/seo/metadata.test.ts`
- `tests/fixtures/list-html.mjs`
- `src/content/** (재동기화)`
- `src/data/** (재생성)`
