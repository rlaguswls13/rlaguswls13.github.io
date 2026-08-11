# Session Memory

세션 종료 hook이 구조화된 결정·검증·위험을 아래에 append한다. 수동으로 원문 token이나 PII를 추가하지 않는다.

## 2026-08-11T06:45:55.263Z | ulw-20260811-153932

### Summary
AGENTS.md? Kappa LLM RAG ???? agent ?? ??? ?????. metadata, retrieval cues, canonical surface, skill routing, verification gates, safety contract, session memory? ????.

### Decisions
- AGENTS.md? ?? agent entrypoint? ???? project/wiki? ?? canonical source? ??
- Kappa ?? schema? ?? ???? Markdown comment metadata? ???? heading chunk? ??

### Verification
- docs-surface targeted: PASS 2/2
- lint:ci: PASS
- typecheck: PASS
- unit: 147 passed, 4 pre-existing export failures
- validate:content: pre-existing backup filename/frontmatter ID mismatch
- build:local: blocked by missing GISCUS_INFO
- validate:export: 2 pre-existing blockers

### Risks
- Kappa ingestion ??? ?? ???? ?? ?? ??
- ?? content/export gate failures remain

### Changed project surfaces
- `AGENTS.md`
