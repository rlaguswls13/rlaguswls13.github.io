# 개발 및 운영 가이드

## 통합 Notion 콘텐츠 소스

```dotenv
NOTION_TOKEN=...
NOTION_DATA_SOURCE_ID_JOURNAL=...
NOTION_DATA_SOURCE_ID_DEVLOG=...
NOTION_DATA_SOURCE_ID_PROJECT=...
```

`JOURNAL`은 `Category=personal|education`, `DEVLOG`는 `Category=tech_study|problem_solving|competition_event`, `PROJECT`는 `Category=enterprise|personal`로 분기합니다. Devlog와 Project의 `Subcategory`는 MDX 저장 경로와 화면 하위 필터가 됩니다. `NOTION_PAGE_ID_JOURNAL`, `NOTION_PAGE_ID_DEVLOG`, `NOTION_PAGE_ID_PROJECT`도 기존 database ID 호환 이름으로 지원합니다.

동기화 후 화면은 Notion 응답이나 수동 JSON이 아니라 `src/content/**/*.mdx`에서 생성된 `journal.json`, `devlog.json`, `projects.json` 인덱스를 사용합니다.

## 로컬 실행

권장 환경은 Node.js 20과 `package-lock.json` 기준 npm입니다.

```bash
npm ci
npm run dev:no-fetch
```

`dev:no-fetch`는 저장된 콘텐츠를 사용하며 slug와 추천 인덱스는 다시 생성합니다. Notion까지 갱신하려면 필요한 환경 변수를 설정한 뒤 실행합니다.

```bash
npm run dev
```

## 환경 변수

Notion 데이터 소스는 역할이 드러나는 카테고리 접미사를 권장합니다.

```dotenv
NOTION_TOKEN=...
NOTION_DATA_SOURCE_ID_EDUCATION=...
NOTION_DATA_SOURCE_ID_PERSONAL=...
```

페이지 ID를 사용한다면 `NOTION_PAGE_ID_EDUCATION`, `NOTION_PAGE_ID_PERSONAL`도 지원합니다. 동기화 스크립트는 `NOTION_PAGE_ID*`, `NOTION_DATA_SOURCE_ID*` 이름과 `category:id` 값도 해석합니다.

그 밖의 선택 변수:

```dotenv
BASE_PATH=ROOT
ADSENSE_ACCOUNT=...
GA4_PROPERTY_ID=G-...
GISCUS_GITHUB_TOKEN=...
```

공개 사이트/Giscus 기본 설정은 `src/data/config/site.json`에서 관리합니다. `NEXT_PUBLIC_SITE_URL`과 `NEXT_PUBLIC_GISCUS_*` 변수로 환경별 덮어쓰기가 가능합니다. Notion 토큰과 GitHub 토큰이 포함된 로컬 환경 파일은 커밋하지 않습니다.

## 콘텐츠 작업

### 수동 MDX

1. `src/content/devlog/{category}/{id}.mdx`를 추가하거나 수정합니다.
2. frontmatter에 공개 주소용 `slug`를 지정합니다.
3. 썸네일이 필요하면 `public/thumnail/{id}.{ext}`처럼 같은 ID를 사용합니다.
4. `npm run generate-slugs`를 실행합니다.

파일명은 slug가 아니라 안정적인 `source_id`입니다. `slugs.json`은 파일명 변경 목록이 아니라 공개 주소 라우팅 맵입니다.

### Notion

```bash
npm run fetch-notion
```

- `education` → `src/data/pages/main/notion/education.json`
- `personal` → `src/data/pages/main/notion/personal.json`
- 개인일지 콘텐츠의 공개 카테고리/MDX 경로 → `blog`
- 원격 이미지 → `public/images/notion/`

기존 JSON의 `lastEditedTime`이 같고 ID 이름의 MDX가 존재하면 불필요한 콘텐츠 재변환을 건너뜁니다.

## 데이터 생성 명령

```bash
npm run generate-slugs
npm run generate-recommendations
npm run fetch-engagement
```

생성 결과는 각각 `src/data/config/slugs.json`, `src/data/indexes/devlog-recommendations.json`, `src/data/indexes/engagement.json`에 저장됩니다. 고정 Devlog 목록 메타데이터는 별도 조회 데이터인 `src/data/indexes/devlog.json`에서 관리하며 slug 생성 명령이 이 파일을 변경하지는 않습니다.

## 검증

```bash
npm run lint
npx tsc --noEmit
npm run build:no-fetch
```

외부 동기화까지 검증해야 할 때는 `npm run build`를 사용합니다. 정적 결과물은 `out/`에 생성됩니다.

## 배포

GitHub Actions는 Node.js 20에서 의존성을 설치하고 Notion을 동기화한 다음 로컬 데이터 기반 빌드를 수행해 `out/`을 GitHub Pages에 배포합니다. 사용자 페이지 저장소는 루트 경로를 사용하며, 다른 저장소는 `BASE_PATH` 설정을 확인해야 합니다.
