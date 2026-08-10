---
name: blog-content-pipeline
description: Use for this repository's Notion synchronization, schema/quarantine, MDX conversion, slug/index generation, thumbnail validation, static export, or content safety work.
---

# Blog Content Pipeline

이 skill은 이 저장소의 소스화된 콘텐츠 파이프라인을 실행하는 절차다. 상세 규칙은 [`project/wiki/content-pipeline.md`](../../wiki/content-pipeline.md)를 canonical source로 읽는다. 운영 환경 설명은 [`project/wiki/operations/guide.md`](../../wiki/operations/guide.md), Notion 세부 정책은 [`project/wiki/pipeline/`](../../wiki/pipeline/)를 사용한다.

## 작업 순서

1. `AGENTS.md`와 `project/wiki/content-pipeline.md`를 읽고 소비자·managed path·기존 변경을 조사한다.
2. Notion/API 변경이면 `omo:debugging`, MDX/화면 변경이면 `omo:frontend`, Node 변경이면 `omo:programming`을 호출한다.
3. 계약 테스트를 먼저 작성한다.
4. `scripts/notion/connect/schema-contract.mjs`로 group/property/type/enum을 검사한다. 위반은 `artifacts/notion-quarantine/`에 안전한 요약을 남기고 중단한다.
5. `scripts/notion/connect/fetch-orchestration.mjs`의 staging transaction 안에서만 MDX와 index를 생성한다. `src/data/config/notion-manifest.json`은 stable page ID diff의 기준이다.
6. MDX compile, slug/routes/index 집합, thumbnail contract를 통과한 뒤에만 promote한다.
7. 변경 후 아래 gate와 필요한 브라우저 검증을 실행하고 `project/wiki/session-memory.md` 또는 review report에 증거를 남긴다.

## 분할된 운영 지식

- 데이터 소유권·정렬·ID 규칙: [`data-sorting.md`](../../wiki/pipeline/data-sorting.md)
- Notion migration과 package 구조: [`notion-devlog-migration.md`](../../wiki/pipeline/notion-devlog-migration.md), [`notion-package-structure.md`](../../wiki/pipeline/notion-package-structure.md)
- Giscus·engagement 생성물: [`giscus-comments.md`](../../wiki/pipeline/giscus-comments.md), [`engagement-stats.md`](../../wiki/pipeline/engagement-stats.md)
- 썸네일: `thumbnail-contract` skill과 [`thumbnail-rules.md`](../../wiki/pipeline/thumbnail-rules.md)

```bash
npm run validate:content
npm run lint:ci
npm run typecheck
npm run test:unit -- --run
npm run build:local
npm run validate:export
```

## 금지

- slug를 파일명이나 삭제 기준으로 사용하지 않는다.
- live content/index/thumbnail을 staging 검증 전에 덮어쓰지 않는다.
- Notion 값, token, PII를 로그·wiki·artifact에 기록하지 않는다.
- `src/data/config/slugs.json`, `routes.json`, index를 수동 편집하지 않는다.
