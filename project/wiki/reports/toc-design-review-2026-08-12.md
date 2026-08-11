# 목차 UI 디자인 검토

## 최종 방향

사용자 확인 결과 목차는 사이드 rail이 아닌 본문 상단에만 배치한다. `fit-content`와 `max-width: 100%`를 사용해 데스크톱에서는 내용 폭에 맞춰 줄어들고, 좁은 화면에서는 viewport 안에서만 확장된다.

## 변경

긴 글의 첫 번째 `## 목차`와 목록을 기존 본문과 분리된 읽기 rail로 표시하도록 `src/app/globals.css`를 수정했다. 1280px에서는 우측 20rem rail, 768px 이하에서는 본문 위 full-width 패널로 전환하며, 목록은 제한 높이와 스크롤을 갖는다. 기존 semantic color token, border, shadow, radius를 사용하고 링크 hover·keyboard focus 상태를 추가했다.

## 검증

UI lane:

- Production build: `npm run build:local` PASS.
- Playwright route: `/devlog/tech_study/ai-agent-basic-tech`.
- Fresh screenshots: `artifacts/playwright/toc-desktop.png`, `toc-tablet.png`, `toc-mobile.png`, `toc-desktop-focus.png`.
- Viewports: 1280x900, 768x900, 375x900.
- Focus assertion: first TOC link focused, computed outline `rgb(62, 101, 166) solid 2px`.
- Two independent visual QA reviewers inspected the user reference and all fresh captures; both returned PASS.

Backend/content lane:

- `npx vitest run tests/quality/browser-gates.test.mjs tests/content/thumbnail-contract.test.mjs`: 2 files / 5 tests PASS.
- `npm run lint:ci`: PASS.
- `npm run typecheck`: PASS.

The repository-wide Playwright command timed out after 300 seconds because the configured preview server used an occupied port; the requested route was nevertheless exercised directly with Playwright on the running preview. The final top-only captures are `artifacts/playwright/top-desktop.png` and `artifacts/playwright/top-mobile.png`; two fresh visual QA reviewers returned PASS.
