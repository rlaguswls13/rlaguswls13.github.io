# Devlog Notion 동기화

> 현재 권장 구성은 `NOTION_DATA_SOURCE_ID_JOURNAL`, `NOTION_DATA_SOURCE_ID_DEVLOG`, `NOTION_DATA_SOURCE_ID_PROJECT` 세 원본입니다. 기존 카테고리별 환경변수는 전환 기간 호환용이며, 화면 데이터는 모두 생성된 MDX 인덱스를 사용합니다.

GitHub Pages 정적 배포에서는 Notion 토큰을 브라우저에 노출할 수 없으므로, 빌드 시작 시
Notion API를 호출해 목록 JSON과 MDX 캐시를 생성합니다. API 장애 시 저장소에 남은 마지막
캐시로 정적 사이트를 계속 빌드할 수 있습니다.

데이터 소스에는 `scripts/notion/connect/schema-contract.mjs`에 선언된 속성을 사용합니다. 원본
page ID와 frontmatter slug는 공개 URL 및 댓글 연결을 유지하므로 기존 값이 있다면 바꾸지 않습니다.

| 속성 | Notion 타입 | 필수 |
| --- | --- | --- |
| title | Title | 예 |
| category | Select/Status | 예 (group별 허용 enum) |
| created_date | Date | 예 |
| subcategory | Select/Status | 선택 |
| tags | Multi-select | 선택 |
| description | Rich text | 선택 |
| slug | Rich text | 선택 |

정의되지 않은 column, 타입 불일치, 필수 누락, 허용되지 않은 enum은
`artifacts/notion-quarantine/report.json`에 안전한 요약으로 기록하고 동기화를 중단합니다.

## 1. API 연결

Notion integration에 각 데이터 소스를 공유하고 환경변수를 설정합니다.

```dotenv
NOTION_TOKEN=<set outside the repository>
NOTION_DATA_SOURCE_ID_JOURNAL=<source id>
NOTION_DATA_SOURCE_ID_DEVLOG=<source id>
NOTION_DATA_SOURCE_ID_PROJECT=<source id>
```

기존 `NOTION_PAGE_ID_*` database ID는 전환 기간 호환 입력이며 신규 설정에서는 사용하지 않습니다.

```text
NOTION_PAGE_ID_TECH_STUDY + Category=container
→ src/content/devlog/tech_study/container/{ID}.mdx
→ /devlog/tech_study/{Slug}

NOTION_PAGE_ID_PROBLEM_SOLVING + Category=java
→ src/content/devlog/problem_solving/java/{ID}.mdx
→ /devlog/problem_solving/{Slug}
```

현재 API는 data source ID를 사용합니다. legacy database ID는 호환 경계에서만 지원합니다.

## 2. 동기화와 배포

```bash
npm run fetch-notion
npm run build
```

`tech_study`, `problem_solving`, `competition_event`는 Notion 목록으로
`src/data/indexes/devlog.json`의 해당 카테고리를 교체합니다. 본문은 기존 ID 파일을 찾아
갱신하므로 URL과 Giscus discussion term이 유지됩니다. 새 글은
`src/content/devlog/{category}/{package}/{id}.mdx`에 생성됩니다.
