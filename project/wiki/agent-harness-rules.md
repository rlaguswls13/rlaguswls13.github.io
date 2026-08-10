# Agent Harness Rules

이 문서는 이전 `docs/AGENT_HARNESS.md`에 있던 운영 규칙을 project surface에 보존한 canonical policy입니다. 실행 순서는 skill이 담당하고, 이 파일은 에이전트가 지켜야 할 공통 경계를 정의합니다.

## Execution order

1. `AGENTS.md`, `docs/README.md`, 관련 wiki를 읽고 소비자·영향 범위를 조사합니다.
2. 작업 유형에 맞는 installed skill과 project skill을 호출합니다.
3. 동작 변경은 실패하는 계약 테스트를 먼저 작성합니다.
4. 구현 후 lint, typecheck, unit, build/export 및 필요한 브라우저 검증을 실행합니다.
5. 결과·기존 실패·잔여 위험을 session memory에 기록합니다.

## Pipeline boundaries

- Notion은 `page_id/source_id`를 안정 식별자로 사용하고 slug를 파일명·삭제 기준으로 사용하지 않습니다.
- API 응답은 schema/quarantine을 통과한 뒤 staging에서만 MDX와 index를 생성합니다.
- MDX는 Markdown 우선이며 table, toggle/collapse, diagram은 approved component mapping만 사용합니다.
- compile, URL/image host, slug/routes/index 집합, thumbnail 계약을 모두 통과한 뒤 live content를 원자적으로 promote합니다.
- 실패 시 기존 content, index, thumbnail을 보존합니다.

## UI and quality boundaries

- 기존 `DESIGN.md` 토큰과 시각 언어를 우선하고 임의 색상·간격·폰트를 추가하지 않습니다.
- light/dark 양쪽에서 확인하고 `prefers-reduced-motion`과 `:focus-visible`을 보존합니다.
- 브라우저 검증 viewport는 375px, 768px, 1280px이며 `/`, `/devlog`, `/journal`, `/projects`, 대표 상세 route를 포함합니다.
- 콘솔 오류, 네트워크 실패, 수평 overflow, thumbnail 식별성, component 렌더링, slug 링크를 확인합니다.
- 관련 gate는 `npm run test:e2e`와 `npm run test:lighthouse`를 포함합니다.

## Maintenance and security

- 미사용 import·함수·생성물을 정리하고, 순수 로직 모듈이 250 LOC를 넘으면 책임별 분리를 검토합니다.
- 새 public schema/API는 migration 또는 compatibility 정책을 함께 기록합니다.
- secret, token, PII는 환경변수/GitHub Secret에서만 읽고 문서·로그·artifact·snapshot에 원문을 기록하지 않습니다.
- 외부 URL·image host·download size·redirect를 검증하고, 관련 없는 사용자 변경은 수정·삭제·staging하지 않습니다.
