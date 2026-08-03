# 데이터 정렬 및 분리 기준

이 문서는 화면별 원본 데이터와 조회용 생성 데이터의 책임, 그리고 목록 정렬 기준을 설명합니다.

## 데이터 디렉터리

```text
src/data/
├─ config/
│  ├─ site.json                    # 공개 사이트/Giscus 기본 설정
│  └─ slugs.json                   # category별 source_id → slug 맵
├─ pages/
│  ├─ main/
│  │  ├─ notion/
│  │  │  ├─ education.json         # Notion 교육일지 목록
│  │  │  └─ personal.json          # Notion 개인일지 목록
│  │  └─ ...                       # 메인·목록 화면 원본 데이터
│  └─ detail/
│     └─ ...                       # 상세 화면 전용 데이터
└─ indexes/
   ├─ devlog.json                  # 고정 Devlog 카테고리 조회 인덱스
   ├─ devlog-recommendations.json  # 연관 글 인덱스
   └─ engagement.json              # Giscus 댓글 수 인덱스
```

- `pages/main`: 메인·목록 화면이 직접 사용하는 원본 데이터
- `pages/detail`: 프로젝트 등 상세 화면 전용 원본 데이터
- `indexes`: 조회 성능을 위해 스크립트가 만드는 파생 데이터
- `config`: 공개 설정과 라우팅 맵. 비밀 값은 넣지 않습니다.

## Devlog 카테고리

고정 MDX 카테고리는 `tech_study`, `problem_solving`, `competition_event`이며 `src/data/indexes/devlog.json`에서 조회합니다.

Notion 소스 키는 다음처럼 분리합니다.

| Notion 키 | 메인 데이터 | 공개 Devlog 카테고리 | 화면 이름 |
| --- | --- | --- | --- |
| `education` | `pages/main/notion/education.json` | `education` | 교육일지 |
| `personal` | `pages/main/notion/personal.json` | `blog` | 개인일지 |

`personal`은 Notion 데이터 소스를 식별하는 키입니다. 기존 URL과 콘텐츠 경로의 호환성을 위해 공개 카테고리 및 MDX 디렉터리는 `blog`를 유지합니다.

## 정렬 기준

### 고정 Devlog 목록

고정 카테고리의 목록 메타데이터는 `src/data/indexes/devlog.json`에서 관리합니다. 화면에서는 이 데이터와 Notion 목록을 합친 뒤 게시 날짜 내림차순으로 정렬합니다. `scripts/slug/generate.mjs`는 이 목록을 다시 만들지 않고 ID 이름의 MDX를 검증해 slug 맵만 생성합니다.

### Notion 목록

- Journal, Devlog, Project는 `scripts/notion/connect/fetch.mjs`에서 `created_date` 내림차순으로 저장합니다.
- API 연결과 JSON 저장은 `connect/`, JSON·MDX 형식 변환은 `transfer/`로 분리합니다.
- 페이지별 예외 열 이름과 기본값은 `connect/fetch.mjs`의 `SPECIAL_CASES`에서 선언합니다.

### 인기 콘텐츠

메인 인기 목록은 `src/data/indexes/engagement.json`의 댓글 수를 우선 사용하고, 댓글 수가 같으면 게시 날짜가 최신인 항목을 우선합니다. 상위 5개를 노출합니다. GA4 조회 수는 현재 인기순 계산에 사용하지 않습니다.

### 프로젝트

프로젝트 원본은 `src/data/pages/main/projects.json`, 상세 데이터는 `../src/content/detail/project-detail.json`에서 관리합니다. 화면의 탭·검색·페이지네이션은 원본을 변경하지 않고 렌더링 단계에서 처리합니다.

## ID와 slug 규칙

- MDX 파일명과 썸네일 파일명은 안정적인 Notion/콘텐츠 ID를 사용합니다.
- frontmatter의 `slug`는 공개 URL에만 사용합니다.
- `src/data/config/slugs.json`은 `source_id → slug` 라우팅 지도입니다.
- `/devlog/[category]/[slug]`에서 slug를 ID로 역조회한 뒤 ID 이름의 MDX를 읽습니다.
- slug 생성 때문에 원본 파일명을 바꾸지 않습니다.

생성 명령:

```bash
npm run generate-slugs
npm run generate-recommendations
npm run fetch-engagement
```
