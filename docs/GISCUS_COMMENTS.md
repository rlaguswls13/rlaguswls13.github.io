# Giscus 댓글 연결

Devlog 상세 페이지는 Giscus를 사용합니다. 공개 URL과 discussion term의 역할을 분리해 slug 변경으로 기존 댓글 연결이 끊기지 않도록 구성했습니다.

## 경로 규칙

- 공개 URL: `/devlog/{category}/{slug}`
- MDX 파일: `src/content/devlog/{category}/{id}.mdx`
- Giscus discussion term: `/devlog/{category}/{id}`

라우트는 `src/data/config/slugs.json`의 `source_id → slug` 맵을 역조회해 source_id 이름의 원본을 찾습니다. Giscus는 `specific` 매핑과 ID 기반 term을 사용하므로 slug가 바뀌어도 같은 Discussion을 사용합니다.

## 설정

공개 기본값은 `src/data/config/site.json`에 있습니다. 애플리케이션에서는 `src/lib/site.ts`가 이 파일을 읽고 다음 환경 변수의 값이 있으면 덮어씁니다.

```dotenv
NEXT_PUBLIC_SITE_URL=...
NEXT_PUBLIC_GISCUS_REPOSITORY=owner/repository
NEXT_PUBLIC_GISCUS_REPOSITORY_ID=...
NEXT_PUBLIC_GISCUS_CATEGORY=...
NEXT_PUBLIC_GISCUS_CATEGORY_ID=...
NEXT_PUBLIC_GISCUS_LANGUAGE=ko
```

이 값들은 브라우저에 공개되는 설정입니다. 댓글 수 집계 API에 별도 인증이 필요할 때만 비밀 값인 `GISCUS_GITHUB_TOKEN`을 사용합니다.

## 변경 시 확인 사항

1. MDX와 썸네일의 ID 파일명을 변경하지 않습니다.
2. 공개 주소만 바꾸려면 MDX frontmatter의 `slug`를 수정합니다.
3. `npm run generate-slugs`를 실행해 맵을 갱신합니다.
4. 기존 Giscus discussion term은 ID 기반으로 유지합니다.
5. `npm run fetch-engagement`로 댓글 수 인덱스를 다시 생성합니다.
