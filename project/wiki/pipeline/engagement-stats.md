# 댓글 참여 통계

홈과 Devlog 목록의 참여 통계는 Giscus가 사용하는 GitHub Discussions 댓글 수를 정적 JSON으로 수집해 사용합니다.

## 생성 파일

```text
src/data/indexes/engagement.json
```

키는 공개 Devlog 경로, 값은 댓글 수입니다. 수집 스크립트는 기존 ID 기반 discussion term과 현재 slug URL을 연결해 화면이 slug 주소를 사용해도 기존 댓글 수를 유지합니다.

## 실행

```bash
npm run fetch-engagement
```

GitHub API 한도를 완화하려면 선택적으로 설정합니다.

```dotenv
GISCUS_GITHUB_TOKEN=...
```

토큰이 없어도 공개 저장소 API로 수집을 시도합니다. 네트워크 또는 API 요청이 실패하면 기존 `engagement.json`을 보존하므로 정적 빌드는 마지막 정상 데이터를 사용할 수 있습니다.

## 빌드 연동

- `npm run build`: Notion, slug, 추천, 참여 통계를 갱신한 뒤 빌드
- `npm run build:no-fetch`: Notion은 건너뛰지만 slug, 추천, 참여 통계는 갱신 시도

GA4는 브라우저 방문 분석용 로컬 패키지이며 이 댓글 통계나 인기순 계산의 입력이 아닙니다.
