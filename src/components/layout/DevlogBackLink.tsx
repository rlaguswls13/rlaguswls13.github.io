"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function DevlogBackLinkInner({ category }: { category: string }) {
  const searchParams = useSearchParams();
  const pkg = searchParams.get("pkg") || "All";
  const page = searchParams.get("page") || "1";
  const q = searchParams.get("q") || "";
  
  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
  const isJournal = category === "education" || category === "blog";
  const href = isJournal
    ? `/journal?category=${category === "blog" ? "personal" : "education"}${qParam}&page=${page}`
    : `/devlog?tab=${category}&pkg=${pkg}${qParam}&page=${page}`;
  
  return (
    <Link href={href} className="back-link">
      ← 목록으로
    </Link>
  );
}

export function DevlogBackLink({ category }: { category: string }) {
  const fallbackHref = category === "education" || category === "blog"
    ? `/journal?category=${category === "blog" ? "personal" : "education"}`
    : `/devlog?tab=${category}`;
  return (
    <Suspense fallback={<Link href={fallbackHref} className="back-link">← 목록으로</Link>}>
      <DevlogBackLinkInner category={category} />
    </Suspense>
  );
}
