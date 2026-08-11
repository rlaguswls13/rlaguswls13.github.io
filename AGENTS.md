# Blog Agent Harness

<!--
document_id: blog-agent-harness
document_type: repository-agent-instructions
document_status: canonical-entrypoint
audience: coding-agents
language: ko
scope: repository-wide
canonical_detail: docs/README.md, project/skills/, project/wiki/
retrieval_queries: agent 작업 순서, skill 라우팅, 검증 게이트, 변경 안전성, 세션 memory
-->

## 문서 역할과 우선순위

이 문서는 이 저장소에서 작업하는 agent의 **진입점**입니다. 작업을 시작할 때 이 파일을 먼저 읽고, 절차의 상세 내용은 `project/skills/`, 정책·결정·근거는 `project/wiki/`의 canonical 문서에서 확인합니다.

## Kapa RAG 문서 프로필

| 필드 | 값 |
| --- | --- |
| 문서 ID | `blog-agent-harness` |
| 문서 유형 | repository agent instructions |
| 대상 독자 | coding agents working in this repository |
| 적용 범위 | repository-wide |
| 권위 수준 | entrypoint; 상세 절차와 정책은 linked canonical source가 우선 |
| 최신성 기준 | 현재 checkout의 `AGENTS.md`, linked skill/wiki, 실제 코드·테스트 |
| 주요 source group | `agent-harness`, `project-skills`, `project-wiki` |
| 인용 기준 | 이 파일의 해당 heading과 연결된 repository path를 함께 제시 |

이 문서는 Markdown heading과 표를 기준으로 의미 단위가 나뉩니다. Kapa 또는 다른 RAG 소비자는 `문서 역할과 우선순위`, `작업 시작`, `skill 라우팅`, `검증 게이트`, `변경 안전성`, `세션 종료` heading을 section title과 citation anchor로 사용해야 합니다. HTML 주석 metadata만으로 문서의 의미를 판단하지 않습니다.

### 이 문서에 대한 자주 묻는 질문

#### Q: 작업을 시작할 때 가장 먼저 읽을 문서는 무엇인가?

A: `AGENTS.md`를 먼저 읽고, `docs/README.md`와 변경 유형에 맞는 `project/skills/` 및 `project/wiki/` 문서를 이어서 확인합니다.

#### Q: 상세 절차와 장기 정책은 어디에 있는가?

A: 반복 절차와 입력·출력·검증 계약은 `project/skills/`, 정책·결정·검증 근거·위험은 `project/wiki/`, lifecycle 자동화는 `project/hooks/`가 소유합니다. 이 파일은 entrypoint이며 상세 규칙의 복사본이 아닙니다.

#### Q: 답변에 어떤 출처를 인용해야 하는가?

A: 주장과 가장 가까운 heading의 repository path를 인용합니다. 이 파일의 공통 규칙은 `AGENTS.md`, 실행 절차는 해당 `project/skills/<name>/SKILL.md`, 정책·결정은 해당 `project/wiki/*.md`, 자동화 동작은 해당 `project/hooks/*`를 출처로 사용합니다.

#### Q: 문서와 코드가 서로 다르면 무엇을 우선하는가?

A: 사용자의 현재 요청과 안전 제약, 이 파일의 공통 규칙, 관련 skill, 관련 wiki, 구현 코드와 테스트 순서로 판단합니다. 불일치가 남으면 추측하지 말고 검증 결과와 위험을 기록합니다.

#### Q: 이 문서가 답하지 않는 질문에는 어떻게 해야 하는가?

A: 문서에 근거가 없으면 사실을 만들어내지 말고 `확인할 수 없음`이라고 명시합니다. 관련 canonical source나 실제 검증 결과를 찾은 뒤 답변하고, source가 없으면 문서화 gap으로 기록합니다.

우선순위는 다음과 같습니다.

1. 사용자의 현재 요청과 안전 제약
2. 이 `AGENTS.md`의 저장소 공통 규칙
3. 작업 유형에 맞는 installed skill과 `project/skills/` task skill
4. 관련 `project/wiki/` 정책·결정·검증 근거
5. 구현 코드와 기존 테스트의 실제 동작

`docs/README.md`는 `project/skills/`, `project/hooks/`, `project/wiki/`의 관계를 설명하는 문서 surface controller입니다. 이 파일에 pipeline의 세부 절차를 복사하지 말고 해당 canonical 문서로 이동합니다.

### 검색용 주제와 동의어

이 문서가 다루는 주제는 다음 검색어로도 찾을 수 있습니다: `agent harness`, `agent workflow`, `skill routing`, `quality gate`, `content validation`, `session memory`, `canonical wiki`, `RAG metadata`, `Kapa source group`, `safe change`.

## 작업 시작: 컨텍스트와 영향 범위

모든 작업은 아래 순서로 시작합니다.

1. 이 파일, `docs/README.md`, 관련 `project/wiki/` 문서를 읽습니다.
2. `.agent/session-handoff.md`가 있으면 읽고, 현재 작업을 그 파일의 `Current status`와 `Remaining tasks`에 반영합니다.
3. 변경 대상과 소비자를 조사합니다. 특히 managed path, 생성 파일, hook, 외부 연동 여부를 확인합니다.
4. 작업 유형에 맞는 installed skill과 `project/skills/` task skill을 호출합니다.
5. 새 계약이나 동작 변경이면 실패하는 테스트 또는 가장 가까운 실제 표면의 failing-first 증거를 먼저 확보합니다. 순수 문서·주석 변경에는 문장 검색 테스트를 만들지 않습니다.
6. 최소 변경을 구현하고, 변경 범위에 맞는 검증을 실행합니다.

## 공통 세션 handoff 계약

에이전트 종류와 실행 도구에 관계없이 작업 중간 상태는 `.agent/session-handoff.md`에 기록합니다. 이 파일은 글로벌 skill이 아니라 저장소 루트의 공통 baton이므로 Claude Code, Antigravity, Codex 등 다음 에이전트가 같은 형식으로 이어받을 수 있습니다.

- 작업을 시작하면 `status: active`로 바꾸고 `updated_at`, 현재 진행 상황, 변경된 기능, 남은 태스크를 기록합니다.
- 막힌 경우 `status: blocked`로 바꾸고 필요한 사용자 결정이나 외부 조건을 명시합니다.
- 세션을 넘길 수 있는 상태면 `status: ready`로 바꾸고 다음 에이전트가 먼저 할 일을 적습니다.
- 실행한 검증, 기존 실패, 위험, 결정 이유를 함께 기록합니다. 비밀·token·PII·긴 로그는 기록하지 않습니다.
- 기록은 append/update 방식으로 유지하고, handoff 파일을 삭제하거나 비워서 인수인계 정보를 잃지 않습니다.

세션 종료 시 마지막 baton을 받은 에이전트는 `.agent/session-handoff.md`의 존재와 `status`를 확인합니다. 파일이 존재하고 `status`가 `active`, `blocked`, `ready`이면 기록을 바탕으로 다음 두 작업을 요청합니다.

1. 최종 Wiki에 결정·검증·위험·남은 태스크를 반영합니다.
2. 변경 diff와 검증 증거를 대상으로 PR review를 요청합니다.

`node project/hooks/session-end.mjs`는 이 확인 결과를 `handoff` 객체로 반환합니다. `requestFinalWiki` 또는 `requestPrReview`가 `true`이면 요청을 생략하지 말고 후속 작업으로 남깁니다.

### 단계형 skill 호출

반복해서 handoff 절차를 프롬프트에 적지 않도록 `project/skills/session-handoff-workflow`를 옵션과 함께 호출합니다.

```text
$session-handoff-workflow start "작업 내용"
$session-handoff-workflow checkpoint
$session-handoff-workflow continue
$session-handoff-workflow finish
```

옵션이 없으면 현재 handoff 상태에 따라 `start`, `continue`, `finish`를 자동 선택합니다.

## Canonical agent surfaces

| Surface | 책임 | 대표 진입 문서 | 여기에 두지 않는 것 |
| --- | --- | --- | --- |
| `project/skills/` | 반복 가능한 절차, 입력·출력·검증 계약 | `project/skills/<name>/SKILL.md` | 장기 결정의 근거 기록 |
| `project/hooks/` | host agent lifecycle adapter | `project/hooks/README.md` | 수동 운영 정책 |
| `project/wiki/` | 정책, 결정, 검증 증거, 위험, durable memory | `project/wiki/index.md` | 실행 가능한 hook 로직 |
| `docs/README.md` | legacy docs와 project surface의 안내·매핑 | `docs/README.md` | 상세 규칙의 복사본 |

관련 정보가 여러 곳에 있을 때는 실행 절차는 skill, 정책과 결정은 wiki, 자동화 동작은 hook을 source of truth로 취급합니다. 중복된 설명을 새로 만들기보다 canonical 링크를 남깁니다.

## 작업 유형별 skill 라우팅

| 작업 유형 | 필수 skill |
| --- | --- |
| TypeScript/JavaScript/Node | `omo:programming` |
| Notion/API 동기화 런타임 | `omo:debugging` |
| MDX/테마/컴포넌트/화면 | `omo:frontend` |
| 브라우저·반응형·접근성 | `omo:visual-qa`, `blog-verification` |
| AdSense 연결·검증 | `project/skills/google-adsense-operations` |
| Search Console 등록·verification | `project/skills/google-search-console-operations` |
| sitemap/RSS/검색 feed | `project/skills/google-search-feeds` |
| 썸네일 bitmap 생성 | `imagegen` |
| 구조 개선 | `omo:refactor` |
| Git 이력·커밋 | `omo:git-master` |
| 완료 전 검토 | `omo:review-work` |
| AI slop 제거 요청 | `omo:remove-ai-slops` |
| 단계형 agent 작업·handoff | `project/skills/session-handoff-workflow` |

콘텐츠·pipeline 관련 작업은 먼저 `project/skills/blog-content-pipeline`, `project/skills/release-gate`, `project/skills/session-memory-wiki`를 확인합니다. 세부 도메인에 해당하면 `thumbnail-contract`, `google-adsense-operations`, `google-search-console-operations`, `google-search-feeds`도 확인합니다.

## 검증 게이트

기본 검증 명령은 다음과 같습니다.

```powershell
npm run validate:content
npm run lint:ci
npm run typecheck
npm run test:unit -- --run
```

정적 산출물·콘텐츠 pipeline을 변경했다면 다음도 실행합니다.

```powershell
npm run build:local
npm run validate:export
```

화면을 변경했다면 `blog-verification`과 `omo:visual-qa`로 실제 브라우저에서 375px, 768px, 1280px 및 light/dark 상태를 확인합니다. 실행 결과, 기존 실패, 잔여 위험은 `project/wiki/session-memory.md` 또는 필요한 report에 기록합니다.

## 변경 안전성 계약

- Notion 원본은 안정적인 `page_id`/`source_id`를 식별자로 사용하고 slug를 파일명 식별자로 사용하지 않습니다.
- schema 위반은 `artifacts/notion-quarantine/`에 안전한 요약 보고서를 남기고 sync·commit·deploy를 차단합니다.
- staging 검증이 끝나기 전 live 콘텐츠·index·썸네일을 교체하지 않습니다.
- 비밀 값은 환경변수 또는 GitHub Secret에서만 읽고 문서·로그·JSON·MDX·artifact에 기록하지 않습니다.
- 관련 없는 사용자 변경은 수정·삭제·staging하지 않습니다.
- 생성 파일은 generator를 통해서만 갱신하고, 기존 실패를 숨기거나 테스트를 약화하지 않습니다.

## 세션 종료와 durable memory

세션 종료 시 host agent는 구조화된 `session_end` event를 `node project/hooks/session-end.mjs`에 전달합니다. event에는 결정, 실행한 검증, 잔여 위험, 변경 파일을 짧게 포함하고 secret·token·PII·긴 로그는 포함하지 않습니다. hook은 memory wiki를 갱신하고 project surface만 commit합니다.

규칙을 변경하기 전에는 `project/wiki/reports/agent-harness-report.md`의 승인 상태와 `project/wiki/docs-migration.json`의 surface 매핑을 확인합니다. 규칙 변경과 그 근거는 필요한 report에도 남깁니다.
