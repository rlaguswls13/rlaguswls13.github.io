# TECH LOG — 개발자 포트폴리오

김현진의 경력, 프로젝트, 기술 학습·문제 해결 기록, 교육일지와 개인일지를 제공하는 정적 포트폴리오/기술 블로그입니다. Next.js App Router와 TypeScript를 기반으로 하며, JSON·MDX·Notion 콘텐츠를 정적 페이지로 빌드해 GitHub Pages에 배포합니다.

- Repository: `rlaguswls13/ralguswls13.github.io`
- Site: `https://rlaguswls13.github.io`

## 주요 기능

- `Home`: 페이지 이동 없이 카테고리별 최신 글을 전환하고 인기 태그를 탐색하는 기술 블로그 홈
- `About`: `/about`에서 제공하는 프로필, 핵심 경험, 참여/개인 작업 쇼케이스, 기술 및 관심사
- `Projects`: 참여/개인 작업 탭, 검색, 페이지네이션, 프로젝트 상세 화면
- `Devlog`: 카테고리·패키지 필터, 검색, MDX 상세 문서
- `Journal`: 교육일지/개인일지, MDX 상세 문서
- `Career`: `/career`에서 제공하는 경력·학력·자격증 타임라인
- `Contact`: 이메일, 전화, GitHub 연락 수단
- 라이트/다크 테마와 모바일·태블릿·데스크톱 반응형 UI
- URL 쿼리에 검색어, 탭, 필터, 페이지 상태 보존 및 태그 기반 통합 검색

## 작업 환경

| 구분 | 구성 |
| --- | --- |
| 프레임워크 | Next.js 16.2.6 (App Router, Static Export) |
| UI | React 19.2.4, React DOM 19.2.4 |
| 언어 | TypeScript 5 (strict mode) |
| 스타일 | Tailwind CSS 4 PostCSS 플러그인 + `src/app/globals.css` 디자인 토큰/전역 CSS |
| 콘텐츠 | JSON, MDX 3, gray-matter, next-mdx-remote |
| 코드 하이라이트 | rehype-pretty-code, Shiki |
| 품질 검사 | ESLint 9, eslint-config-next |
| 배포 | Next.js static export, GitHub Actions, GitHub Pages |
| 권장 런타임 | Node.js 24.13.1, npm (`package-lock.json` 기준) |

## 시작하기

```bash
npm ci
npm run dev:no-fetch
```

브라우저에서 `http://localhost:3001`을 엽니다. 저장된 로컬 콘텐츠만 사용할 때는 `dev:no-fetch`가 가장 빠릅니다.

Notion 원격 콘텐츠까지 갱신하며 실행하려면 환경 변수를 설정한 뒤 `npm run dev`를 사용합니다.

### 환경 변수

| 변수 | 설명 |
| --- | --- |
| `NOTION_TOKEN` | Notion API 통합 토큰 |
| `NOTION_DATA_SOURCE_ID_JOURNAL` | 통합 일지 데이터 소스 ID |
| `NOTION_DATA_SOURCE_ID_DEVLOG` | Devlog 데이터 소스 ID |
| `NOTION_DATA_SOURCE_ID_PROJECT` | Project 데이터 소스 ID |
| `NOTION_REQUIRED_GROUPS` | CI에서 `journal,devlog,project`를 요구하는 검증 목록 |
| `BASE_PATH=ROOT` | 운영 빌드를 도메인 루트에 배포 (기본값). 별도 프로젝트 배포 시 경로 직접 지정 |
| `GISCUS_INFO` | 사이트 URL과 Giscus 저장소 설정을 담은 JSON 문자열 |
| `GISCUS_GITHUB_TOKEN` | 댓글 수 집계 시 GitHub API 한도 완화를 위한 선택 토큰 |
| `ADSENSE_ACCOUNT` | Google AdSense 게시자 ID (예: `ca-pub-...`); 설정 시 메타 태그와 `ads.txt` 생성 |
| `GA4_PROPERTY_ID` | GA4 측정 ID (예: `G-...`) |
| `SEARCH_CONSOLE_VERIFICATION` | Search Console meta 태그의 content 값 |

통합된 세 원본 변수를 우선 사용합니다. 기존 `EDUCATION`·`PERSONAL` 변수는 마이그레이션 기간에만 호환되며 새 배포 설정에는 사용하지 않습니다. 정적 빌드는 먼저 공개 환경값을 `.cache/build/public-config.json`으로 고정하고, 이후 애플리케이션 모듈은 환경변수가 아니라 이 리소스만 읽습니다. `ADSENSE_ACCOUNT`가 있으면 같은 단계에서 `public/ads.txt`를 만든 뒤 Next가 정적 산출물에 포함합니다. 공개 사이트/Giscus 설정은 GitHub Environment의 `GISCUS_INFO` Variable 한 곳에서 관리합니다. 로컬에서는 같은 JSON 문자열을 `.env.local.yml`의 `GISCUS_INFO`에 저장합니다. 민감한 값이 포함된 로컬 환경 파일은 커밋하지 않습니다.

## npm 명령

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | Notion 동기화 후 개발 서버 실행 |
| `npm run dev:no-fetch` | 외부 동기화 없이 개발 서버 실행 |
| `npm run fetch-notion` | Notion 콘텐츠 증분 동기화 |
| `npm run generate-slugs` | ID와 공개 slug의 라우팅 맵 생성 |
| `npm run generate-recommendations` | Devlog 추천 인덱스 생성 |
| `npm run fetch-engagement` | Giscus 댓글 수 인덱스 갱신 |
| `npm run build` | Notion 동기화 후 정적 프로덕션 빌드 |
| `npm run build:no-fetch` | Notion 동기화 없이 정적 빌드 |
| `npm run lint` | ESLint 검사 |
| `npm run verify` | 콘텐츠 검증, lint/typecheck, 단위 테스트를 순서대로 실행 |
| `npm run build:local` | 네트워크 없이 로컬 생성기와 정적 export 실행 |
| `npm run validate:export` | `out/` 정적 export 경로·메타데이터 검증 |
| `npm run test:e2e` | Playwright 브라우저 계약 검사 |
| `npm run test:lighthouse` | Chrome 안정 버전의 3회 Lighthouse 행렬 실행 |
| `npm run review:quality` | 기준 커밋부터 품질·보안 diff 보고서 생성 |
| `npm run review:manual` | 기존 브라우저/axe/Lighthouse 증거를 수집해 수동 QA 보고서 생성 |
| `npm run review:scope` | 계획·커밋 범위·소유 루트 해시를 검증 |

## 프로젝트 구조

```text
blog/
├─ .github/workflows/deploy.yml     # GitHub Pages 빌드·배포 및 저장소 동기화
├─ docs/                            # project surface 대표 컨트롤러(README.md만 유지)
├─ project/                         # skills, lifecycle hooks, canonical wiki
├─ public/
│  ├─ images/notion/               # Notion에서 내려받은 이미지
│  └─ thumnail/                    # 안정적인 ID 이름의 Devlog 썸네일
├─ scripts/
│  ├─ ga4/                         # GA4 로컬 패키지
│  ├─ slug/                        # Devlog ID → slug 맵 생성·검증
│  ├─ notion/                      # journal/devlog/project staging·변환·검증
│  ├─ engagement/                  # Giscus 참여 통계 수집
│  └─ recommendations/             # Devlog 추천 데이터 생성
├─ src/
│  ├─ app/                         # App Router 페이지와 전역 스타일
│  │  ├─ about/                    # 개발자 프로필과 경험 소개
│  │  ├─ blog/                     # 기존 URL 호환용 루트 리다이렉트
│  │  ├─ career/                   # 경력·학력·자격증 페이지
│  │  ├─ contact/                  # 연락처 페이지
│  │  ├─ devlog/                   # Devlog 목록/동적 상세 라우트
│  │  └─ projects/                 # 프로젝트 목록/동적 상세 라우트
│  ├─ components/
│  │  ├─ diagrams/                 # 프로젝트·Devlog용 React 다이어그램
│  │  ├─ layout/                   # Navbar, 테마, 공통 뒤로가기 UI
│  │  └─ ui/                       # 카드, 탭, 캐러셀, Notion 렌더러 등
│  ├─ content/devlog/              # 안정적인 ID 파일명의 MDX 콘텐츠
│  ├─ data/
│  │  ├─ config/                  # 공개 사이트 설정·slug 매핑
│  │  ├─ pages/main/              # 메인·목록 및 Notion 화면 데이터
│  │  ├─ pages/detail/            # 상세 화면 데이터
│  │  └─ indexes/                 # 조회용 사전 계산 인덱스·캐시
│  ├─ lib/                         # 사이트 설정, slug, 썸네일, 공통 유틸리티
│  └─ types/                       # 실제 사용하는 공통 TypeScript 타입
├─ next.config.ts                  # static export, basePath, 이미지 설정
├─ package.json
└─ tsconfig.json
```

## 콘텐츠 흐름

1. `scripts/notion/connect/fetch.mjs`가 journal/devlog/project 원본을 조회하고 schema 검증 후 staging transaction에서 MDX로 변환합니다.
2. `scripts/notion/connect/`에는 API 인증·조회·schema/quarantine·원자적 promotion 흐름을 둡니다.
3. `scripts/notion/transfer/`는 MDX 변환, UTF 인코딩과 줄바꿈 정규화, MDX 컴포넌트 이름 매핑과 화면용 인덱스 생성을 담당합니다.
4. `npm run transfer-notion-json -- <input.json> <output-dir> [page-name]`으로 JSON을 MDX로 변환할 수 있습니다.
5. `scripts/slug/generate.mjs`가 frontmatter의 slug를 읽어 `src/data/config/slugs.json`에 `source_id → slug` 맵을 생성합니다.
6. 추천 콘텐츠와 댓글 수는 `src/data/indexes/`에 생성하고, `next build`는 결과물을 `out/`에 static export합니다.

Notion 동기화 없이 작업할 때는 `dev:no-fetch` 또는 `build:no-fetch`를 사용하세요. `build:no-fetch`도 댓글 수 갱신은 시도하며, 요청이 실패하면 기존 `engagement.json`을 유지합니다.

## 디자인 시스템

`src/app/globals.css`는 primitive/semantic CSS 변수로 라이트·다크 테마를 구성합니다. 현재 UI는 `img.png` 레퍼런스를 바탕으로 다음 원칙을 사용합니다.

- 밝은 캔버스와 얇은 중성 경계, 낮은 카드 그림자
- 블루/인디고 단일 포인트 컬러와 명확한 활성 상태
- 정보 밀도가 높은 카드형 목록과 절제된 라운드
- Noto Sans KR/Inter 본문, JetBrains Mono 보조 타이포그래피
- 기능을 숨기지 않는 반응형 내비게이션과 가로 스크롤 탭

새 컴포넌트는 하드코딩한 색상보다 `--bg-*`, `--text-*`, `--accent-*`, `--border-color` 같은 semantic token을 우선 사용합니다.

## 검증 및 배포

```bash
npm run verify
npm run build:local
npm run validate:export
```

품질 검증은 배포 전에 로컬에서 수행합니다. GitHub Actions는 `.nvmrc`에 고정한 Node.js 24.13.1에서 의존성을 설치하고 정적 빌드를 수행한 다음 `out/`을 GitHub Pages artifact로 배포합니다. Search Console은 `SEARCH_CONSOLE_VERIFICATION` meta 태그 방식만 사용하며 HTML 인증 파일을 배포하지 않습니다. `*.github.io` 사용자 페이지 저장소는 자동으로 루트 경로를 사용하며, 그 외 저장소는 `USE_ROOT_BASE_PATH` 변수 또는 저장소명에 따라 `basePath`를 결정합니다.

에이전트 운영의 대표 진입점은 [`docs/README.md`](docs/README.md)입니다. 실행 절차는
[`project/skills/`](project/skills/), lifecycle 자동화는 [`project/hooks/`](project/hooks/),
상세 정책과 기술 배경은 [`project/wiki/`](project/wiki/)에서 관리합니다.
