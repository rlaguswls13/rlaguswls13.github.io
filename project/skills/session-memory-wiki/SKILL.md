---
name: session-memory-wiki
description: Use when a blog agent session ends or when durable decisions, verification evidence, open risks, or implementation memory must be written to project/wiki and safely committed.
---

# Session Memory Wiki

세션 종료 시 `project/hooks/session-end.mjs`가 이 skill의 계약을 실행한다. 상세 wiki 운영 규칙은 [`project/wiki/agent-memory.md`](../../wiki/agent-memory.md)를 읽는다.

## 기록할 것

- 결정과 그 이유
- 실제 실행한 검증 명령과 결과
- 미해결 위험·기존 실패·다음 작업
- 변경된 project skill/wiki/hook 파일

비밀 값, 원문 token, PII, 긴 로그는 기록하지 않는다. 세션 요약은 짧은 구조화 입력으로 hook에 전달한다.

## 수동 실행

```powershell
@'{"type":"session_end","session_id":"local","summary":"...","decisions":["..."],"risks":["..."]}'@ | node project/hooks/session-end.mjs
```

hook은 wiki memory를 갱신하고 `project/skills`, `project/hooks`, `project/wiki` 범위만 stage한 뒤 commit한다. 범위 밖의 사용자 변경은 자동 commit하지 않는다.
