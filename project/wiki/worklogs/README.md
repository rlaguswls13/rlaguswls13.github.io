# Wiki Worklogs

이 디렉터리는 기계가 생성하는 append-only 실행 이력을 보관합니다. 현재 정책이나 설계의 source of truth가 아니며 `project-worklogs` source group의 `history-only` 검색에만 사용합니다.

## Indexing worklog

`indexing.jsonl`의 각 줄은 한 번의 RAG 문서 인덱싱 결과입니다.

| 필드 | 의미 |
| --- | --- |
| `runId`, `indexedAt`, `status` | 실행 식별자, UTC 시각, 결과 |
| `registrySha256`, `indexSha256` | 입력 분류 계약과 생성 인덱스 fingerprint |
| `documentCount`, `groupCounts` | 전체 및 source group별 문서 수 |
| `changes` | 이전 인덱스 대비 added, updated, removed 경로 |

실행 로그에서 반복적으로 확인된 결정은 관련 canonical Wiki에 정리하고, 상세 실패 로그나 비밀 값은 기록하지 않습니다.
