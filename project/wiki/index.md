# Project Wiki

`project/wiki/`는 에이전트가 재사용할 durable knowledge와 검증 근거의 canonical 영역입니다. 실행 절차는 skill, lifecycle 자동화는 hook에 둡니다.

## Navigation

- [Content pipeline](content-pipeline.md): Notion, schema, staging, MDX, index, slug, thumbnail 계약
- [Pipeline references](pipeline/): 정렬, Giscus, engagement, migration, package structure, thumbnail 세부 규칙
- [Architecture](architecture/tech-stack.md): 런타임·앱·빌드 구조
- [Operations](operations/guide.md): 로컬 실행·환경·배포 운영 지식
- [Agent memory](agent-memory.md): 세션 종료 memory와 redaction 정책
- [Session memory](session-memory.md): hook이 append하는 실행 기록
- [Reports](reports/): 승인 상태, review 결과, 잔여 위험, [surface gate review](reports/docs-to-project-surface-gate-review.md)
- [Documentation migration](docs-migration.json): 이전 `docs/*.md`와 canonical target의 기계 판정용 매핑

## Ownership

| Surface | Put here | Do not put here |
| --- | --- | --- |
| `project/skills/` | 재현 가능한 절차와 호출 조건 | 긴 결정 기록 |
| `project/hooks/` | host lifecycle adapter와 범위 제한 자동화 | 수동 운영 정책 |
| `project/wiki/` | 정책, 설계, 결정, 검증, 위험 | 실행 가능한 hook 로직 |
