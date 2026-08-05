# 기술 스택과 구조

## 런타임과 프레임워크

| 영역 | 구성 |
| --- | --- |
| 런타임 | Node.js 24.13.1, npm |
| 웹 | Next.js 16 App Router, React 19 |
| 언어 | TypeScript strict mode |
| 출력 | Next.js static export (`out/`) |
| 스타일 | Tailwind CSS 4, 전역 CSS 디자인 토큰 |
| 콘텐츠 | JSON, MDX, gray-matter, next-mdx-remote |
| 코드 렌더링 | rehype-pretty-code, Shiki |
| 품질 | ESLint 9, TypeScript compiler |
| 배포 | GitHub Actions, GitHub Pages |

## 애플리케이션 데이터

데이터는 사용 화면과 생성 목적에 따라 분리합니다.

```text
src/data/
├─ pages/main/       # 메인·목록 화면 원본
├─ pages/detail/     # 상세 화면 원본
├─ indexes/          # 조회 성능용 파생 데이터
└─ config/           # 공개 설정과 ID → slug 맵
```

사이트/Giscus 설정 로더는 `src/lib/site.ts`에 있으며 JSON 설정과 환경 변수 덮어쓰기를 결합합니다. 공통 타입은 `src/types/`에 모으고 `src/lib/`에는 런타임 로직만 둡니다.

## 콘텐츠와 라우팅

Devlog의 저장 식별자와 공개 주소를 분리합니다.

```text
ID 이름의 MDX
    ↓ frontmatter slug 수집
slugs.json (source_id → slug)
    ↓ 공개 경로 생성
/devlog/{category}/{slug}
    ↓ slug를 ID로 역조회
ID 이름의 MDX 로드
```

이 구조는 제목이나 slug를 바꿔도 원본 파일, 썸네일, Giscus Discussion이 안정적인 ID를 계속 사용하게 합니다.

## Notion 파이프라인

`scripts/notion/connect/fetch.mjs`가 환경 변수에서 데이터 소스를 수집하고 Notion 열을 JSON으로 저장합니다.

- `connect/notion-client.mjs`: 인증, REST 요청, 페이지네이션
- `connect/fetch.mjs`: 데이터 소스 조회, 동적 열 변환, JSON 인덱스 저장
- `transfer/json-to-mdx.mjs`: JSON 레코드를 MDX frontmatter와 본문으로 변환
- `transfer/compatibility.mjs`: UTF-8/UTF-16 디코딩, BOM 제거, LF 줄바꿈 정규화
- `transfer/component-mappings.mjs`: Notion 표기 컴포넌트를 지정된 MDX 컴포넌트로 전환

## 작업 스크립트

```text
scripts/
├─ ga4/              # 브라우저 GA4 로컬 패키지
├─ slug/             # slug 맵과 고정 Devlog 인덱스
├─ notion/           # Notion 추출·변환
├─ engagement/       # Giscus 댓글 수
└─ recommendations/  # 연관 Devlog 인덱스
```

GA4는 `@blog/ga4-analytics` 로컬 패키지로 애플리케이션에서 사용하며 Next.js가 transpile합니다. 댓글 수와 추천 데이터는 빌드 전에 JSON으로 계산해 브라우저의 외부 조회와 반복 계산을 줄입니다.

## 빌드 흐름

`npm run build`:

1. Notion `education`/`personal` 동기화
2. ID 이름의 MDX 검증과 ID → slug 맵 생성
3. 추천 인덱스 생성
4. Giscus 댓글 수 갱신
5. Next.js static export

`npm run build:no-fetch`는 1단계만 생략합니다. 참여 통계 요청이 실패하면 기존 인덱스를 유지합니다.
