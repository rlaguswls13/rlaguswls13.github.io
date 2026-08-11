# Project hooks

`session-end.mjs` is the session termination adapter. Configure the host agent to pipe its structured `session_end` event to this file:

```powershell
@'{"type":"session_end","session_id":"local","summary":"...","verification":["npm run typecheck: PASS"],"risks":[]}'@ | npm run session:end
```

It updates `project/wiki/session-memory.md`, redacts secret-shaped values, and commits only `project/skills`, `project/hooks`, and `project/wiki`. It never stages source, generated content, environment files, or unrelated user changes.
`project/hooks/`는 host agent lifecycle에 연결되는 얇은 adapter만 보관합니다. 운영 정책과 장기 기록은 `project/skills/session-memory-wiki`와 `project/wiki/agent-memory.md`가 소유합니다.

## Session handoff

모든 에이전트는 저장소 루트의 `.agent/session-handoff.md`에 현재 진행 상황, 변경된 기능, 남은 태스크, 검증 결과와 위험을 기록합니다. `session-end.mjs`는 이 파일의 `status`를 읽어 다음 baton을 위한 후속 요청을 반환합니다.

```json
{
  "handoff": {
    "path": ".agent/session-handoff.md",
    "exists": true,
    "recorded": true,
    "status": "ready",
    "requestFinalWiki": true,
    "requestPrReview": true
  }
}
```

`requestFinalWiki` 또는 `requestPrReview`가 `true`이면 handoff 내용을 근거로 최종 Wiki 생성과 PR review를 요청해야 합니다. hook은 handoff 본문을 자동 commit하지 않으며, secrets·token·PII가 들어가지 않도록 에이전트가 기록 단계에서 redaction합니다.

## Session end

`node project/hooks/session-end.mjs`는 `session_end` JSON event를 받아 memory를 append하고, `project/skills`, `project/hooks`, `project/wiki` 범위만 선택적으로 commit합니다. 범위 밖 파일은 stage하거나 commit하지 않습니다. token·PII는 redaction 후에도 원문을 기록하지 않습니다.

실행 계약과 fixture는 [`tests/project/session-end-hook.test.mjs`](../../tests/project/session-end-hook.test.mjs)에서 확인합니다.
