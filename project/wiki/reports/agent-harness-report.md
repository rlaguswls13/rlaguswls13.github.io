# Agent Harness 운영 정리 보고서

## 승인 상태

- [x] `approved`
- canonical 운영 지식: [`project/wiki/`](../)
- project skills: [`project/skills/`](../../skills/)
- session hook: [`project/hooks/session-end.mjs`](../../hooks/session-end.mjs)
- 승인 기준: 기존 transaction/security/content gate를 유지하고, 신규 schema/quarantine/manifest/thumbnail 계약을 테스트로 고정함

## 현재 상태와 충돌

- Notion transaction, MDX compile/security, deterministic index 검사는 이미 존재했다.
- property 예외가 `SPECIAL_CASES`에 흩어져 있어 명시적 schema가 없었다.
- 이전 `GUIDE.md`에 폐기된 `site.json`과 Search Console HTML file 인증 설명이 남아 있었다. 현재 canonical 운영 문서는 [`project/wiki/operations/guide.md`](../operations/guide.md)다.
- 썸네일 경로 규칙은 있었지만 누락·WebP·크기 계약과 ImageGen handoff가 없었다.

## 변경 정책

- schema: `scripts/notion/connect/schema-contract.mjs`
- diff: stable page ID와 revision 기반 `classifyNotionPages`
- quarantine: 값 대신 타입·길이 요약을 기록하고 sync를 차단
- MDX: existing component mapping과 compile gate 유지
- thumbnail: `scripts/thumbnail/thumbnail-contract.mjs`에서 ID path/WebP/576×384 검사
- 문서: `AGENTS.md`, [`docs/README.md`](../../../docs/README.md), 기존 stale 규칙 정리

## 검토 체크리스트

- [x] skill routing 및 실행 순서
- [x] group별 Notion schema, 필수/enum/type 정책
- [x] new/updated/deleted/unchanged 판정
- [x] staging transaction과 rollback 원칙
- [x] Markdown/table/toggle/diagram mapping 및 MDX compile
- [x] 썸네일 생성·검수·기존 파일 보존
- [x] slug/index deterministic 계약
- [x] 로컬 quality gate와 브라우저 gate
- [x] secret 및 외부 URL 보안 경계

## 구현 후 검증

- `npx vitest run tests/notion/schema-contract.test.mjs tests/notion/fetch-orchestration.test.mjs`: PASS
- `npx vitest run tests/content/thumbnail-contract.test.mjs`: PASS
- 전체 gate 결과는 작업 종료 시 아래에 추가한다.

## 기존 실패와 잔여 위험

- 이번 변경과 무관한 기존 프로젝트 순서·placeholder metadata 실패는 수정하지 않는다.
- 실제 Notion schema가 새 column을 도입하면 quarantine 보고서가 sync를 중단한다. schema 파일에 명시적으로 추가한 뒤 fixture와 gate를 갱신해야 한다.
- 썸네일 팔레트·격자·식별성은 브라우저/사람 검수가 필요하며 바이너리 계약만으로 대체하지 않는다.

## 최종 결과

구현 완료. 전체 gate는 기존 저장소 결함 때문에 부분 실패했으며 이번 변경의 targeted gate는 통과했다.

### Gate 결과

| Gate | 결과 | 근거 |
| --- | --- | --- |
| `validate:content` | 기존 실패 | backup MDX filename/frontmatter ID 불일치 |
| `lint:ci` | PASS | exit 0 |
| `typecheck` | PASS | exit 0 |
| targeted unit | PASS | 6 files, 40 tests |
| full unit | 기존 실패 | 151개 중 147개 통과; project order 2건, placeholder metadata 2건 |
| `build:local` | 실행 불가 | 환경에 `GISCUS_INFO` 없음 |
| `validate:export` | 기존 실패 | duplicate `/projects/d`, placeholder description |
| browser/Lighthouse | 미실행 | 이번 변경은 UI를 수정하지 않았고 production build precondition이 실패함 |

### 최종 review 상태

현재 surface gate review는 [`docs-to-project-surface-gate-review.md`](docs-to-project-surface-gate-review.md)에 `PASS`로 기록했다. 이전 context mining이 발견한 README/workflow/migration/data 문서 stale 규칙은 수정했다. pre-existing content/index 문제는 이 운영 규칙 작업에서 수정하지 않았다.
