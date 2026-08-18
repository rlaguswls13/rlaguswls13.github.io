---
name: release-gate
description: Use before committing or promoting blog content, generated indexes, hooks, skills, or wiki changes.
---

# Release Gate

커밋·promote 전 변경 범위와 자동 생성 결과를 검증합니다. 원본 checklist는 [`references/pre-commit-checklist.md`](references/pre-commit-checklist.md)이고 pipeline 규칙은 [`wiki/content-pipeline.md`](../../../wiki/content-pipeline.md)입니다.

## Procedure

1. 관련 없는 사용자 변경을 수정·삭제·staging하지 않습니다.
2. 계약 테스트를 먼저 실행하고, 생성 파일은 generator를 통해서만 갱신합니다.
3. 콘텐츠 변경이면 `validate:content`, `lint:ci`, `typecheck`, unit, `build:local`, `validate:export`를 범위에 맞게 실행합니다.
4. 화면 변경이면 Playwright 기반 `blog-verification`과 `omo:visual-qa`를 추가해 light/dark와 375/768/1280 viewport를 확인합니다.
5. 실행한 명령, 기존 실패, 잔여 위험을 session memory 또는 review report에 기록합니다.

```bash
npm run validate:content
npm run lint:ci
npm run typecheck
npm run test:unit -- --run
npm run build:local
npm run validate:export
```
