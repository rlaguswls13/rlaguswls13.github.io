"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";

const SUPPORT_EMAIL = "gcd1324@gmail.com";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const mailtoHref = useMemo(() => {
    const pageUrl = typeof window !== "undefined" ? window.location.href : "";
    const subject = encodeURIComponent("[블로그 오류 제보] 페이지 렌더링 실패");
    const bodyLines = [
      `문제가 발생한 페이지 주소: ${pageUrl}`,
      error.digest ? `오류 코드: ${error.digest}` : null,
      "",
      "(어떤 상황에서 발생했는지 간단히 적어주시면 도움이 됩니다)",
    ].filter((line): line is string => line !== null);
    const body = encodeURIComponent(bodyLines.join("\n"));
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }, [error.digest]);

  return (
    <main className="status-page-shell" aria-labelledby="error-heading">
      <p className="status-page-code" aria-hidden="true">500</p>
      <h1 id="error-heading">페이지를 표시하는 중 오류가 발생했습니다</h1>
      <p className="status-page-description">
        일시적인 문제로 이 페이지를 불러오지 못했습니다. 다시 시도하거나 홈으로 이동해주세요.
      </p>
      <div className="status-page-actions">
        <button type="button" className="tech-primary-button" onClick={() => reset()}>
          다시 시도 <span>↻</span>
        </button>
        <Link href="/" className="tech-secondary-button">
          홈으로 가기
        </Link>
      </div>
      <p className="status-page-contact">
        문제가 계속되면 오류가 발생한 페이지 주소와 함께{" "}
        <a href={mailtoHref}>{SUPPORT_EMAIL}</a>로 메일 보내주세요.
        {error.digest ? (
          <span className="status-page-error-digest">오류 코드: {error.digest}</span>
        ) : null}
      </p>
    </main>
  );
}
