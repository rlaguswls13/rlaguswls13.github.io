---
name: thumbnail-contract
description: Use when creating, validating, or repairing blog thumbnails and their stable Notion ID mappings.
---

# Thumbnail Contract

썸네일 자동 생성·검수 작업에서 사용합니다. 상세 시각 규칙은 [`project/wiki/pipeline/thumbnail-rules.md`](../../wiki/pipeline/thumbnail-rules.md)를 읽고, bitmap 생성은 설치된 `imagegen` skill을 호출합니다.

## Procedure

1. `public/thumnail/{type}/{id}.webp`에서 stable ID 기존 asset을 먼저 찾습니다.
2. 없을 때만 `imagegen`으로 생성하고 기존 asset은 명시적 요청 없이 덮어쓰지 않습니다.
3. WebP, 576×384, 밝은 격자 배경, 네이비/블루 팔레트, 중앙 단일 주제, 텍스트·로고·워터마크 없음인지 검사합니다.
4. frontmatter/index의 source ID와 파일명이 일치하는지 검사합니다.
5. 누락·불일치·검수 실패는 sync/promote/deploy를 차단하고 `project/wiki/session-memory.md`에 증거를 남깁니다.

## Verification

```bash
npx vitest run tests/content/thumbnail-contract.test.mjs
```
