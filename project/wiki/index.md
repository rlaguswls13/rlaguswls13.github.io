# Project Wiki

`project/wiki/`는 에이전트가 재사용할 durable knowledge와 검증 근거의 canonical 영역입니다. 실행 절차는 skill, lifecycle 자동화는 hook에 둡니다.

## Navigation

- [Content pipeline](content-pipeline.md): Notion, schema, staging, MDX, index, slug, thumbnail 계약
- [Pipeline references](pipeline/): 정렬, Giscus, engagement, migration, package structure, thumbnail 세부 규칙
- [Architecture](architecture/tech-stack.md): 런타임·앱·빌드 구조
- [Operations](operations/guide.md): 로컬 실행·환경·배포 운영 지식
- [Search engine operations](../skills/): AdSense, Google Search Console, Naver Search Advisor, sitemap/RSS 실행 skill
- [Agent memory](agent-memory.md): 세션 종료 memory와 redaction 정책
- [RAG indexing contract](rag/README.md): source group, 문서 권위, 검색 우선순위, 생성 인덱스
- [Reports](reports/): 낮은 권위의 시점별 검증 근거와 [surface gate review](reports/docs-to-project-surface-gate-review.md)
- [Worklogs](worklogs/README.md): 기본 검색에서 제외하는 인덱싱 실행 이력과 기존 [session memory](session-memory.md)
- [Documentation migration](docs-migration.json): 이전 `docs/*.md`와 canonical target의 기계 판정용 매핑

## Ownership

| Surface | Put here | Do not put here |
| --- | --- | --- |
| `project/skills/` | 재현 가능한 절차와 호출 조건 | 긴 결정 기록 |
| `project/hooks/` | host lifecycle adapter와 범위 제한 자동화 | 수동 운영 정책 |
| `project/wiki/` | 정책, 설계, 결정, 검증, 위험 | 실행 가능한 hook 로직 |

## RAG 경계

`project/wiki/rag/source-registry.json`이 문서별 source group과 검색 모드의 기계 판독 기준입니다. canonical 문서는 기본 검색에 사용하고, reports는 근거가 필요한 경우 보조 검색하며, worklog와 `session-memory.md`는 이력 질의에서만 사용합니다.
