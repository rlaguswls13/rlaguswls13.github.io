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

권장 환경은 `.nvmrc`에 고정한 Node.js 24.13.1과 `package-lock.json` 기준 npm입니다.

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
NOTION_DATA_SOURCE_ID_JOURNAL=...
NOTION_DATA_SOURCE_ID_DEVLOG=...
NOTION_DATA_SOURCE_ID_PROJECT=...
```

기존 `EDUCATION`·`PERSONAL` 이름은 마이그레이션 기간의 호환 입력으로만 지원합니다. 새 설정에서는 통합 `JOURNAL`, `DEVLOG`, `PROJECT` 이름을 사용합니다.

그 밖의 선택 변수:

```dotenv
BASE_PATH=ROOT
ADSENSE_ACCOUNT=ca-pub-...
GA4_PROPERTY_ID=G-...
GISCUS_GITHUB_TOKEN=...
```

GA4 측정 ID와 Google AdSense 게시자 메타 값은 해당 환경 변수가 설정된 경우에만 생성됩니다. `ADSENSE_ACCOUNT`가 설정된 GitHub Pages 배포에서는 `out/ads.txt`도 자동 생성됩니다. AdSense 등록은 (1) AdSense의 Sites에서 사이트를 추가하고 (2) 메타 태그 방식으로 소유권을 확인한 뒤 (3) Request review를 요청하는 순서로 진행합니다. EEA·영국·스위스 방문자에게 개인화 광고를 제공하려면 AdSense의 Privacy & messaging에서 Google CMP 또는 인증된 제3자 CMP를 설정해야 합니다. 공개 사이트/Giscus 기본 설정은 `src/data/config/site.json`에서 관리합니다. `NEXT_PUBLIC_SITE_URL`과 `NEXT_PUBLIC_GISCUS_*` 변수로 환경별 덮어쓰기가 가능합니다. Notion 토큰과 GitHub 토큰이 포함된 로컬 환경 파일은 커밋하지 않습니다.

공식 안내: [사이트 추가 및 연결](https://support.google.com/adsense/answer/12169212), [ads.txt 관리](https://support.google.com/adsense/answer/7532444), [CMP 설정](https://support.google.com/adsense/answer/7670013)

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
npm run verify
npm run build:local
npm run validate:export
```

외부 동기화까지 검증해야 할 때는 `npm run build`를 사용합니다. 정적 결과물은 `out/`에 생성됩니다.

## 배포

품질 검증은 배포 전에 로컬에서 수행합니다. GitHub Actions는 Node.js 24.13.1에서 의존성을 설치하고 정적 빌드를 수행한 다음 `out/`을 GitHub Pages에 배포합니다. 사용자 페이지 저장소는 루트 경로를 사용하며, 다른 저장소는 `BASE_PATH` 설정을 확인해야 합니다.
