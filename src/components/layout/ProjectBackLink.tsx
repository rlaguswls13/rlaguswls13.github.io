"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { projectListQuery } from "@/lib/list-query";

function ProjectBackLinkInner() {
  const searchParams = useSearchParams();
  const href = projectListQuery.href(projectListQuery.parse(searchParams));
  
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
