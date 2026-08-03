# 커밋 전 체크리스트

## 변경 범위

- 관련 없는 사용자 변경을 덮어쓰지 않았는지 확인합니다.
- 새 데이터가 화면 책임에 맞는 위치에 있는지 확인합니다.
  - 메인·목록: `src/data/pages/main/`
  - 상세: `../src/content/detail/`
  - 조회용 생성 데이터: `src/data/indexes/`
  - 공개 설정/라우팅 맵: `src/data/config/`
- `src/types/`에는 실제 사용하는 타입만 남기고 중복 타입을 만들지 않습니다.

## Devlog와 slug

- MDX 파일명은 `src/content/devlog/{category}/{id}.mdx` 형식을 유지합니다.
- 썸네일도 가능하면 같은 안정적인 ID 파일명을 사용합니다.
- frontmatter의 `slug`만 공개 URL에 사용합니다.
- `src/data/config/slugs.json`을 수동으로 파일명 변경 지시처럼 사용하지 않습니다.
- slug 변경 후 `npm run generate-slugs`를 실행합니다.
- Giscus discussion term은 기존 댓글 호환을 위해 ID 기반인지 확인합니다.

## Notion

- Notion 소스 키는 `education`, `personal`인지 확인합니다.
- 개인일지의 공개 카테고리와 콘텐츠 경로는 `blog`를 유지합니다.
- 목록 데이터는 `src/data/pages/main/notion/education.json`, `personal.json`으로 분리합니다.
- 내용이 바뀌지 않았는데 `lastEditedTime`이나 생성 파일을 불필요하게 갱신하지 않는지 확인합니다.

## 생성 데이터

필요한 명령만 실행합니다.

```bash
npm run generate-slugs
npm run generate-recommendations
npm run fetch-engagement
```

- `src/data/indexes/devlog.json`에 고정 카테고리만 포함되는지 확인합니다.
- 개인일지 데이터가 `devlog.json`에 중복 저장되지 않는지 확인합니다.
- 네트워크 실패 시 기존 `engagement.json`이 보존되는지 확인합니다.

## 품질 검사

```bash
npm run lint
npx tsc --noEmit
npm run build:no-fetch
```

Notion과 외부 수집까지 확인하는 변경이면 `npm run build`도 실행합니다. 생성된 정적 페이지의 `/devlog/{category}/{slug}`가 ID 이름의 MDX로 정상 연결되는지 확인합니다.

## 보안

- `.env*`와 토큰을 커밋하지 않습니다.
- `NOTION_TOKEN`, `GISCUS_GITHUB_TOKEN`을 JSON이나 클라이언트 코드에 넣지 않습니다.
- `src/data/config/site.json`에는 브라우저에 공개 가능한 값만 둡니다.
- 로그와 문서 예시에 실제 비밀 값이 포함되지 않았는지 확인합니다.

## Git 확인

```bash
git status --short
git diff --check
git diff
```

자동 생성 파일을 포함해 의도한 변경만 스테이징합니다.
