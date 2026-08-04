"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { devlogListQuery, journalListQuery } from "@/lib/list-query";

function getListHref(category: string, searchParams: Readonly<{ get(name: string): string | null }>) {
  if (category === "education" || category === "blog") {
    const categoryState = journalListQuery.parse(new URLSearchParams({
      category: category === "blog" ? "personal" : "education",
    }));
    const state = journalListQuery.parse(searchParams);

    return journalListQuery.href({ ...state, tab: categoryState.tab });
  }

  const categoryState = devlogListQuery.parse(new URLSearchParams({ tab: category }));
  const state = devlogListQuery.parse(searchParams);

  return devlogListQuery.href({ ...state, tab: categoryState.tab });
}

function DevlogBackLinkInner({ category }: { category: string }) {
  const searchParams = useSearchParams();
  const href = getListHref(category, searchParams);
  
  return (
    <Link href={href} className="back-link">
      ← 목록으로
    </Link>
  );
}

export function DevlogBackLink({ category }: { category: string }) {
  const fallbackHref = getListHref(category, new URLSearchParams());
  return (
    <Suspense fallback={<Link href={fallbackHref} className="back-link">← 목록으로</Link>}>
      <DevlogBackLinkInner category={category} />
    </Suspense>
  );
}
