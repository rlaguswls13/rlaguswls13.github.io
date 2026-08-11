---
name: session-handoff-workflow
description: Run repository work through the shared .agent/session-handoff.md baton. Use when the user invokes the skill with start, checkpoint, continue, or finish options, or asks to hand work between agents without repeating workflow instructions.
---

# Session Handoff Workflow

이 skill은 에이전트 종류별 custom skill을 만들지 않고, 저장소 루트의 `.agent/session-handoff.md` 하나를 공통 baton으로 사용하는 단계형 작업 계약입니다.

## 호출 형식

```text
$session-handoff-workflow <option> <task or note>
```

지원 옵션은 `start`, `checkpoint`, `continue`, `finish`입니다. 옵션이 없으면 handoff 상태를 읽어 `empty`는 `start`, `active|blocked`는 `continue`, `ready`는 `finish`로 해석합니다.

## 공통 시작 규칙

1. 저장소 루트의 `AGENTS.md`, `.agent/session-handoff.md`가 있으면 읽습니다.
2. handoff의 `Current status`, `Changed features`, `Remaining tasks`, `Verification`, `Risks and decisions`를 현재 작업 컨텍스트에 반영합니다.
3. 작업 중에는 handoff를 갱신합니다. 비밀·token·PII·긴 로그는 기록하지 않습니다.
4. 변경 작업은 저장소의 관련 skill과 failing-first 검증 규칙을 따릅니다.

## 옵션별 동작

### `start <task>`

새 작업을 시작합니다.

- handoff를 `status: active`로 갱신합니다.
- 사용자의 task를 목표·성공 조건·남은 태스크로 분해합니다.
- 저장소를 조사하고 필요한 skill을 읽은 뒤 구현과 검증을 진행합니다.
- 중간에 중요한 결정이나 위험이 생기면 즉시 handoff에 기록합니다.

호출 예:

```text
$session-handoff-workflow start "Notion 동기화 오류를 수정하고 검증해줘"
```

### `checkpoint [note]`

현재 작업을 중간 점검합니다.

- 현재 진행 상황, 변경 파일, 완료·미완료 태스크, 검증 결과, 위험을 handoff에 기록합니다.
- 사용자 판단이 필요한 결정은 별도 목록으로 제시합니다.
- 사용자가 중단을 요청하지 않았다면 handoff를 유지한 채 작업을 계속합니다.

호출 예:

```text
$session-handoff-workflow checkpoint
```

### `continue [task]`

다른 에이전트가 남긴 작업을 이어받습니다.

- handoff를 먼저 읽고 `status: active`로 갱신합니다.
- 이미 완료된 작업을 반복하지 않고 `Remaining tasks`부터 재개합니다.
- 기록과 현재 worktree가 충돌하면 현재 파일·테스트·git 상태를 권위 있는 근거로 삼고 충돌을 handoff에 기록합니다.
- 남은 태스크와 검증을 끝낸 뒤 `ready` 또는 `blocked`로 전환합니다.

호출 예:

```text
$session-handoff-workflow continue
```

### `finish`

현재 baton을 정리하고 다음 단계의 Wiki·PR review 요청을 생성합니다.

1. handoff와 현재 diff를 다시 읽습니다.
2. 변경 범위에 맞는 테스트·lint·typecheck·build gate를 실행합니다.
3. 검증 결과와 기존 실패를 handoff에 기록하고 `status: ready`로 갱신합니다.
4. `node project/hooks/session-end.mjs`에 `session_end` event를 전달합니다.
5. hook 결과의 `handoff.requestFinalWiki`와 `handoff.requestPrReview`를 확인합니다.
6. 두 값이 `true`이면 handoff를 근거로 최종 Wiki 반영과 PR review 요청을 후속 작업으로 남깁니다. 실제 PR이나 reviewer가 없으면 그 사실을 명시하고 요청을 생략하지 않습니다.

호출 예:

```text
$session-handoff-workflow finish
```

## 상태 전이

| 현재 상태 | 다음 상태 | 의미 |
| --- | --- | --- |
| `empty` | `active` | 새 작업 시작 |
| `active` | `active` | 작업 계속 또는 checkpoint |
| `active` | `blocked` | 사용자 결정·외부 조건이 필요 |
| `active` | `ready` | handoff와 검증이 다음 baton에 전달 가능한 상태 |
| `blocked` | `active` | blocker가 해소되어 재개 |
| `ready` | `active` | 다음 에이전트가 이어받음 |

`status: ready`는 작업이 완벽하다는 뜻이 아니라 다음 에이전트가 최종 Wiki와 PR review 요청을 처리할 준비가 됐다는 뜻입니다.

## 종료 산출물

최소한 `.agent/session-handoff.md`에 다음이 남아야 합니다.

- 현재 진행 상황과 마지막 완료 작업
- 변경된 기능과 파일
- 남아 있는 태스크
- 실행한 검증과 기존 실패
- 위험·결정 이유
- 다음 에이전트가 먼저 할 일
