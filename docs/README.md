# Blog Agent Project Surfaces

이 디렉터리는 상세 규칙을 보관하지 않는 대표 진입점입니다. 에이전트는 작업 전에 이 문서를 읽고, 실제 내용은 아래 canonical surface에서 읽습니다.

## Canonical surfaces

| Surface | 책임 | 시작점 |
| --- | --- | --- |
| `project/skills/` | 반복 가능한 작업 절차, 입력·출력·검증 계약 | [`blog-content-pipeline`](../project/skills/blog-content-pipeline/SKILL.md), [`release-gate`](../project/skills/release-gate/SKILL.md), [`thumbnail-contract`](../project/skills/thumbnail-contract/SKILL.md) |
| `project/hooks/` | 세션 종료처럼 host agent lifecycle에 연결되는 자동화 | [`README.md`](../project/hooks/README.md) |
| `project/wiki/` | 아키텍처, 정책, 결정, 검증 근거, 잔여 위험 | [`index.md`](../project/wiki/index.md) |

## Operating order

1. `AGENTS.md`와 이 컨트롤러를 읽습니다.
2. 작업 유형에 맞는 installed skill과 `project/skills/` skill을 호출합니다.
3. 계약 테스트를 먼저 작성하고, 변경 후 해당 skill의 quality gate를 실행합니다.
4. 세션 종료 시 구조화된 memory를 `project/hooks/session-end.mjs`로 전달합니다.

상세 내용은 `docs/`에 복제하지 않습니다. 문서가 추가되면 `project/wiki/docs-migration.json`과 이 인덱스를 함께 갱신해야 합니다.
