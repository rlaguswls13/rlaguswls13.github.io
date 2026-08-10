# Blog Agent Harness

이 저장소의 모든 에이전트 작업은 `project/skills/`의 task skill과 `project/wiki/`의 canonical 운영 지식을 따릅니다. 대표 문서는 [`docs/README.md`](docs/README.md)입니다.

## 필수 실행 순서

1. 이 파일과 관련 `project/wiki/` 문서를 읽고, 변경 소비자와 영향 범위를 조사합니다.
2. 작업 유형에 맞는 installed skill과 `project/skills/` task skill을 호출합니다.
3. 새 계약은 실패하는 테스트를 먼저 작성하고 실행합니다.
4. 최소 구현 후 `npm run validate:content`, `npm run lint:ci`, `npm run typecheck`, 관련 `npm run test:unit -- --run`을 실행합니다.
5. 정적 산출물 변경은 `npm run build:local`과 `npm run validate:export`까지 실행합니다.
6. 화면 변경은 `blog-verification`과 `omo:visual-qa`로 실제 브라우저에서 375/768/1280px 및 light/dark를 확인합니다.
7. 결과, 기존 실패, 잔여 위험을 `project/wiki/session-memory.md`와 필요한 report에 기록합니다.

## Project agent surfaces

- `project/skills/`: 반복 가능한 작업 절차와 pipeline 계약
- `project/hooks/`: host agent가 호출하는 lifecycle adapter
- `project/wiki/`: durable decisions, verification evidence, risks

세션 종료 시 host agent는 구조화된 `session_end` event를 `node project/hooks/session-end.mjs`에 전달합니다. hook은 memory wiki를 갱신하고 project surface만 commit합니다.

## Skill 라우팅

| 작업 | 필수 skill |
| --- | --- |
| TypeScript/JavaScript/Node | `omo:programming` |
| Notion/API 동기화 런타임 | `omo:debugging` |
| MDX/테마/컴포넌트/화면 | `omo:frontend` |
| 브라우저·반응형·접근성 | `omo:visual-qa`, `blog-verification` |
| 썸네일 bitmap 생성 | `imagegen` |
| 구조 개선 | `omo:refactor` |
| Git 이력·커밋 | `omo:git-master` |
| 완료 전 검토 | `omo:review-work` |
| AI slop 제거 요청 | `omo:remove-ai-slops` |

작업별 project skill은 `project/skills/blog-content-pipeline`, `project/skills/thumbnail-contract`, `project/skills/release-gate`, `project/skills/session-memory-wiki`를 우선 확인합니다.

## 변경 안전성

- Notion 원본은 안정적인 `page_id/source_id`를 식별자로 사용하고 slug를 파일명으로 쓰지 않습니다.
- schema 위반은 `artifacts/notion-quarantine/`에 안전한 요약 보고서를 남기고 sync·commit·deploy를 차단합니다.
- staging 검증이 끝나기 전 live 콘텐츠·index·썸네일을 교체하지 않습니다.
- 비밀 값은 환경변수/GitHub Secret에서만 읽고 문서·로그·JSON·MDX·artifact에 기록하지 않습니다.
- 관련 없는 사용자 변경은 수정·삭제·staging하지 않습니다.

규칙 변경은 먼저 `project/wiki/reports/agent-harness-report.md`의 승인 상태와 `project/wiki/docs-migration.json`의 surface 매핑을 확인합니다.
