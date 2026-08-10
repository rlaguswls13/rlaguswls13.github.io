# Project hooks

`session-end.mjs` is the session termination adapter. Configure the host agent to pipe its structured `session_end` event to this file:

```powershell
@'{"type":"session_end","session_id":"local","summary":"...","verification":["npm run typecheck: PASS"],"risks":[]}'@ | npm run session:end
```

It updates `project/wiki/session-memory.md`, redacts secret-shaped values, and commits only `project/skills`, `project/hooks`, and `project/wiki`. It never stages source, generated content, environment files, or unrelated user changes.
`project/hooks/`는 host agent lifecycle에 연결되는 얇은 adapter만 보관합니다. 운영 정책과 장기 기록은 `project/skills/session-memory-wiki`와 `project/wiki/agent-memory.md`가 소유합니다.

## Session end

`node project/hooks/session-end.mjs`는 `session_end` JSON event를 받아 memory를 append하고, `project/skills`, `project/hooks`, `project/wiki` 범위만 선택적으로 commit합니다. 범위 밖 파일은 stage하거나 commit하지 않습니다. token·PII는 redaction 후에도 원문을 기록하지 않습니다.

실행 계약과 fixture는 [`tests/project/session-end-hook.test.mjs`](../../tests/project/session-end-hook.test.mjs)에서 확인합니다.
