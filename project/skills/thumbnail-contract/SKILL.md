---
name: thumbnail-contract
description: Use when generating, reviewing, validating, or repairing 2.5D blog thumbnail illustrations and their stable Notion ID mappings.
---

# Thumbnail Contract

썸네일 생성·검수 작업에서 사용합니다. 상세 시각 규칙은 `.wiki/pipeline/thumbnail-rules.md`(저장소 밖 `D:\obsidian-storage\project-rag\blog\pipeline\thumbnail-rules.md`, `$PROJECT_RAG_PATH` 우선)를 먼저 읽고, bitmap 생성·편집에는 설치된 `imagegen` skill의 built-in 경로를 사용합니다. 절차적 SVG/로컬 라인아트 생성기를 품질 fallback으로 사용하지 않습니다.

## Procedure

1. `public/thumnail/{type}/{category?}/{id}.webp`에서 stable ID 기존 asset을 먼저 찾고, 글의 `title`, `description`, 핵심 본문으로 한 문장의 시각적 은유를 정합니다.
2. [`references/illustration-generation.md`](references/illustration-generation.md)에서 현재 승인된 2.5D reference 3~5개를 고릅니다. 최근 파일이라는 이유만으로 평면 라인아트나 glossy 3D를 reference로 승격하지 않습니다.
3. `imagegen`에 원본 썸네일은 subject reference, 승인 자산은 style reference로 명시합니다. 텍스트 없는 하나의 시각적 이야기와 60~75% safe area를 요구합니다.
4. 첫 결과는 `artifacts/thumbnail-review/{YYYY-MM-DD}/{id}--vNN.webp`에 흰 배경 RGB WebP 576×384로 정규화합니다. 기존 흰 배경은 유지하고 옅은 청색 격자선만 15~20% 진하게 하며, 기존 live asset은 사용자 승인과 전체 gate 전에는 덮어쓰지 않습니다.
5. 흰 배경 위 격자선, navy/slate/cobalt/white 팔레트, 2.5D 깊이, 작은 카드에서 읽히는 실루엣, 텍스트·로고·워터마크 없음과 파일 크기 예산을 사람이 검사합니다. 배경색이 회색·어두운 색으로 변하거나 격자선이 사라지면 실패입니다.
6. 신규 review 시안은 `scripts/thumbnail/thumbnail-contract.mjs`의 `inspectThumbnailDraft()`로 WebP·크기 검사를 하고, 흰 배경과 격자선 강도는 contact sheet 및 288×192 축소본에서 사람이 확인합니다. 기존 live/placeholder 호환 검사는 `inspectThumbnail()`을 유지하고, frontmatter/index의 source ID와 파일명도 일치하는지 확인합니다.
7. 승인된 시안만 stable ID live 경로로 promote합니다. 누락·불일치·검수 실패는 sync/promote/deploy를 차단하고 `.wiki/session-memory.md`에 증거를 남깁니다.

## Verification

```bash
npx vitest run tests/content/thumbnail-contract.test.mjs
npm run validate:content
```
