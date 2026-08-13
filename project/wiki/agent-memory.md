# Agent Memory Wiki 운영 규칙

`project/wiki`는 저장소에서 재사용할 durable memory와 운영 지식의 canonical 영역이다. 규칙 자체는 skill에 두고, wiki에는 결정·근거·검증·위험을 기록한다.

`session-memory.md`는 기존 hook 호환성을 위한 append-only 실행 이력이며 canonical 정책보다 권위가 낮다. RAG 기본 검색에서는 제외하고 세션 이력 질의에서만 사용한다. 문서 인덱싱 실행 자체의 이력은 `worklogs/indexing.jsonl`이 별도로 소유한다.

## 세션 종료 계약

`project/hooks/session-end.mjs`는 `session_end` JSON event를 입력으로 받는다.

```json
{
  "type": "session_end",
  "session_id": "stable-or-local-id",
  "summary": "짧은 결과",
  "decisions": ["결정"],
  "verification": ["npm run typecheck: PASS"],
  "risks": ["남은 위험"],
  "changed_files": ["project/skills/..."],
  "commit": true
}
```

hook은 memory entry를 append하고 민감한 값 패턴을 redaction한 뒤 `project/skills`, `project/hooks`, `project/wiki`만 commit한다. 입력 event가 없거나 `type`이 다른 경우 wiki와 git을 변경하지 않는다. commit 실패는 성공으로 숨기지 않는다.

## 기억 품질

- 결론보다 결정과 근거를 우선한다.
- 기존 실패와 이번 작업 실패를 구분한다.
- 실행하지 않은 gate를 통과했다고 기록하지 않는다.
- 한 entry는 짧게 유지하고 상세 로그·artifact는 경로만 연결한다.
