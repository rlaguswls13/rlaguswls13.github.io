# LLM RAG 문서 인덱싱 계약

이 디렉터리는 저장소 문서를 외부 LLM RAG 시스템에 전달할 때 사용하는 분류와 인덱스 계약을 소유합니다. 실제 Kapa workspace, credential, embedding 설정은 저장소 밖의 운영 영역이며 여기서 확인할 수 없습니다.

## 권위와 검색 우선순위

| Source group | 역할 | 권위 | 검색 모드 | 사용 시점 |
| --- | --- | ---: | --- | --- |
| `agent-harness` | 저장소 진입점 | 100 | `default` | 작업 순서와 source routing |
| `project-skills` | 재현 가능한 절차 | 90 | `default` | 실행 방법과 검증 계약 |
| `project-wiki` | 현재 정책과 설계 | 90 | `default` | 현재 사실, 결정, 위험 |
| `project-reports` | 시점별 검증 근거 | 50 | `secondary` | review 결과와 과거 증거 |
| `project-worklogs` | 실행 이력 | 10 | `history-only` | 세션·인덱싱 이력 추적 |

동일한 주제가 충돌하면 높은 권위 문서를 우선하고, 같은 권위에서는 현재 checkout의 코드와 테스트에 가까운 문서를 우선합니다. Notion 콘텐츠의 `journal`, `devlog`, `project` 그룹은 별도 데이터 수집 계약이며 이 문서 source group과 무관합니다.

## Registry와 생성 인덱스

- `source-registry.json`은 문서 소유권, 권위, 검색 모드의 단일 기계 판독 기준입니다.
- `document-index.json`은 registry가 가리키는 문서의 제목과 분류를 담고, `default`·`secondary` 문서에는 heading anchor, 크기, SHA-256도 기록하는 생성 파일입니다.
- 한 문서가 둘 이상의 source group에 포함되면 생성이 실패합니다.
- 생성 인덱스에는 실행 시각을 넣지 않아 같은 checkout에서 byte-for-byte 재현됩니다.
- `history-only` 문서는 append가 잦으므로 경로와 분류만 catalog합니다. 세션 memory 갱신만으로 stale gate가 발생하지 않습니다.

```powershell
npm run wiki:index
npm run wiki:index:check
npm run wiki:index:worklog
```

## Chunk와 citation

Markdown heading을 의미 단위와 citation anchor로 사용합니다. 답변은 주장과 가장 가까운 heading의 repository path를 인용해야 하며, HTML 주석 metadata만으로 의미를 판단하지 않습니다.

## Worklog 경계

`project/wiki/worklogs/indexing.jsonl`은 인덱싱 실행마다 입력 registry hash, 결과 index hash, 그룹별 문서 수, added/updated/removed 경로를 한 줄 JSON event로 append합니다. 이 파일은 감사용 실행 이력이며 RAG 문서 인덱스에는 포함하지 않습니다. 장기 정책이나 현재 결론은 worklog가 아니라 해당 canonical Wiki 문서로 승격합니다.
