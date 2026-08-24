import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 | 김현진 TECH LOG",
  description: "요청하신 페이지를 찾을 수 없습니다.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="status-page-shell" aria-labelledby="not-found-heading">
      <p className="status-page-code" aria-hidden="true">404</p>
      <h1 id="not-found-heading">페이지를 찾을 수 없습니다</h1>
      <p className="status-page-description">
        주소가 잘못되었거나 삭제된 페이지일 수 있습니다. 아래에서 원하는 콘텐츠를 다시 찾아보세요.
      </p>
      <div className="status-page-actions">
        <Link href="/" className="tech-primary-button">
          홈으로 가기 <span>→</span>
        </Link>
        <Link href="/tags" className="tech-secondary-button">
          검색하기
        </Link>
      </div>
    </main>
  );
}
