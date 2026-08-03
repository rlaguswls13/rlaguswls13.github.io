# Devlog Notion 동기화

> 현재 권장 구성은 `NOTION_DATA_SOURCE_ID_JOURNAL`, `NOTION_DATA_SOURCE_ID_DEVLOG`, `NOTION_DATA_SOURCE_ID_PROJECT` 세 원본입니다. 기존 카테고리별 환경변수는 전환 기간 호환용이며, 화면 데이터는 모두 생성된 MDX 인덱스를 사용합니다.

GitHub Pages 정적 배포에서는 Notion 토큰을 브라우저에 노출할 수 없으므로, 빌드 시작 시
Notion API를 호출해 목록 JSON과 MDX 캐시를 생성합니다. API 장애 시 저장소에 남은 마지막
캐시로 정적 사이트를 계속 빌드할 수 있습니다.

데이터 소스에는 아래 속성을 사용합니다. `ID`와 `Slug`는 공개 URL 및 댓글 연결을
유지하므로 기존 값이 있다면 바꾸지 않습니다.

| 속성 | Notion 타입 | 필수 |
| --- | --- | --- |
| Name | Title | 예 |
| ID | Rich text | 예 |
| Slug | Rich text | 예 |
| Date 또는 날짜 | Date | 예 |
| Tags 또는 태그 | Multi-select | 예 |
| Description 또는 요약 | Rich text | 권장 |
| Category | Select | 예 (`container`, `springboot`, `java` 등 하위 경로) |
| Package | Select | 선택 (`Category`가 없을 때만 호환용으로 사용) |
| Published 또는 공개 | Checkbox | 선택 |

`Published/공개` 속성이 있으면 체크된 페이지만 동기화합니다. 속성이 없으면 모든 페이지를
동기화합니다.

## 1. API 연결

Notion integration에 각 데이터 소스를 공유하고 환경변수를 설정합니다.

```dotenv
NOTION_TOKEN=secret_xxx
NOTION_DATA_SOURCE_ID=tech_study:xxx,problem_solving:yyy,competition_event:zzz,education:aaa,personal:bbb
```

카테고리별 환경변수도 사용할 수 있습니다.

```dotenv
NOTION_DATA_SOURCE_ID_TECH_STUDY=xxx
NOTION_DATA_SOURCE_ID_PROBLEM_SOLVING=yyy
```

기존 이름을 유지한 `NOTION_PAGE_ID_*` key도 동일하게 동작합니다. key suffix는 상위 콘텐츠
경로가 되고, 각 페이지의 `Category` 값은 하위 경로가 됩니다.

```text
NOTION_PAGE_ID_TECH_STUDY + Category=container
→ src/content/devlog/tech_study/container/{ID}.mdx
→ /devlog/tech_study/{Slug}

NOTION_PAGE_ID_PROBLEM_SOLVING + Category=java
→ src/content/devlog/problem_solving/java/{ID}.mdx
→ /devlog/problem_solving/{Slug}
```

`NOTION_PAGE_ID_TECH_STRUDY`처럼 기존 오타 key를 사용해도 `tech_study`로 정규화합니다.

현재 API는 data source ID를 사용합니다. 기존 `NOTION_PAGE_ID`와 database ID도 전환 기간
동안 `2022-06-28` API로 계속 지원합니다.

## 2. 동기화와 배포

```bash
npm run fetch-notion
npm run build
```

`tech_study`, `problem_solving`, `competition_event`는 Notion 목록으로
`src/data/indexes/devlog.json`의 해당 카테고리를 교체합니다. 본문은 기존 ID 파일을 찾아
갱신하므로 URL과 Giscus discussion term이 유지됩니다. 새 글은
`src/content/devlog/{category}/{package}/{id}.mdx`에 생성됩니다.
