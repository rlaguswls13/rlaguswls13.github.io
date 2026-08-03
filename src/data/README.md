# Data packages

정적 데이터는 사용 목적에 따라 네 영역으로 관리합니다.

- `config/`: 공개 사이트 설정, ID → slug 맵, ID/slug → URL 라우팅 맵
- `pages/main/`: 메인·목록·소개 화면에서 직접 사용하는 원본 데이터
- `../content/detail/`: 프로젝트와 Devlog 상세 화면 전용 데이터
- `indexes/`: 목록, 추천, 참여 통계를 빠르게 조회하기 위한 빌드 타임 인덱스와 캐시

`devlog-recommendations.json`, `engagement.json`, `config/slugs.json`, `config/routes.json`은 `scripts/`의 npm 작업으로 갱신합니다. 화면용 `indexes/{journal,devlog,projects}.json`은 MDX frontmatter를 기준으로 생성합니다. Notion API 응답은 중간 JSON으로 중복 저장하지 않고 바로 MDX로 동기화합니다.

Notion의 `personal`은 개인일지 데이터 소스 키이며 공개 Devlog 카테고리와 MDX 디렉터리는 기존 호환성을 위해 `blog`를 사용합니다. MDX와 썸네일 파일명은 안정적인 ID를 유지하고 slug는 공개 URL에만 사용합니다.
