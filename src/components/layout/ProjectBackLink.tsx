"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ProjectBackLinkInner() {
  const searchParams = useSearchParams();
  const page = searchParams.get("page") || "1";
  const q = searchParams.get("q") || "";
  const tab = searchParams.get("tab") || "enterprise";
  const subcategory = searchParams.get("sub") || "All";
  
  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
  const tabParam = tab !== "enterprise" ? `&tab=${tab}` : "";
  const subcategoryParam = subcategory !== "All" ? `&sub=${encodeURIComponent(subcategory)}` : "";
  const href = `/projects?page=${page}${qParam}${tabParam}${subcategoryParam}`;
  
  return (
    <Link href={href} className="back-link">
      ← 목록으로
    </Link>
  );
}

export function ProjectBackLink() {
  return (
    <Suspense fallback={<Link href="/projects" className="back-link">← 목록으로</Link>}>
      <ProjectBackLinkInner />
    </Suspense>
  );
}
