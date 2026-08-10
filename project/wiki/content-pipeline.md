# Blog Content Pipeline Wiki

## Source groups

`journal`, `devlog`, `project`를 Notion source group으로 사용한다. source ID는 `NOTION_DATA_SOURCE_ID_*` 환경변수에서 읽고, legacy database ID는 호환 경계에서만 사용한다. page ID/source ID는 파일명·삭제·diff의 안정 식별자다.

## Safe promotion

`fetch-orchestration.mjs`는 API 응답을 schema 검사하고 staging transaction에서만 writer와 generator를 실행한다. `new`, `updated`, `deleted`, `unchanged`는 `src/data/config/notion-manifest.json`과 stable ID/revision을 비교한다. validation 실패 시 live content, index, thumbnail을 유지한다.

## Schema and quarantine

`schema-contract.mjs`가 property 이름, 허용 타입, required, category enum, 출력 키를 정의한다. unknown column, empty required value, invalid type/enum은 `artifacts/notion-quarantine/report.json`에 page ID 일부와 값의 타입/길이만 기록하고 sync·commit·deploy를 차단한다.

## MDX and thumbnail

Markdown을 우선하고 table/toggle/callout/image는 approved component mapping을 사용한다. URL scheme/host/redirect/body size와 MDX compile을 경계에서 검사한다. thumbnail은 `public/thumnail/{type}/{category?}/{id}.webp`, WebP, 576×384, 안정 ID를 만족해야 하며 missing/invalid asset은 `imagegen` handoff로 중단한다.

## Generated outputs

`slugs.json`, `routes.json`, journal/devlog/project indexes와 recommendation index는 generator만 갱신한다. 동일 입력의 결과는 byte-deterministic하고 source ID 집합이 MDX 집합과 일치해야 한다.
