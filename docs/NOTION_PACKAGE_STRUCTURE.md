# Notion 패키지 구조

## connect

`scripts/notion/connect/`는 외부 Notion API 통신만 담당합니다.

- `notion-client.mjs`: 인증 헤더, 요청 제한, Database/Data Source 페이지네이션
- `fetch.mjs`: 환경변수 해석, 열 값 단순화, 페이지별 특수 케이스 적용, page-id 맵 저장
- `sync-pages.mjs`: `last_edited_time` 비교 후 변경된 페이지만 본문 조회 및 MDX 갱신
- `index.mjs`: connect 공개 API 진입점

출력은 `src/data/indexes/notion/{journal,devlog,project}.json`입니다. 각 파일은 하이픈을 제거한 Notion page-id를 키로 사용하므로 목록 순회뿐 아니라 특정 페이지를 즉시 조회할 수 있습니다. 과거 배열 형태의 캐시도 읽을 수 있지만 다음 동기화부터 맵 형태로 저장합니다.

## transfer

`scripts/notion/transfer/`는 네트워크 요청 없이 로컬 JSON과 MDX를 변환합니다.

- `compatibility.mjs`: UTF-8/UTF-16, BOM, CRLF/CR/LF 호환
- `component-mappings.mjs`: 소스 태그를 실제 MDX 컴포넌트 이름으로 전환
- `json-to-mdx.mjs`: JSON 레코드에서 frontmatter와 MDX 본문 생성
- `build-*-index.mjs`: 기존 MDX frontmatter에서 화면용 JSON 인덱스 생성
- `index.mjs`: transfer 공개 API 진입점

## 실행

```bash
npm run fetch-notion
npm run transfer-notion-json -- src/data/indexes/notion/devlog.json temp/notion-mdx devlog
npm run generate-content-indexes
```

컴포넌트 매핑을 추가하려면 `component-mappings.mjs`의 페이지별 맵을 수정하거나 CLI 네 번째 인자로 매핑 JSON 파일을 전달합니다.

## URL 맵

`scripts/slug/generate.mjs`는 다음 파일을 함께 생성합니다.

- `src/data/config/slugs.json`: 카테고리별 `page-id → slug`
- `src/data/config/routes.json`: 카테고리별 `page-id → URL`, `slug → { id, URL }`

상세 페이지는 `routes.json`을 사용하므로 slug에서 page-id를 찾기 위해 전체 목록을 순회하지 않습니다.
