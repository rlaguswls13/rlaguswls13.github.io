import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { buildStaticRouteMetadata } from "@/lib/seo/routes";
import { buildTagSearchEntries } from "@/lib/tag-search";
import { TagSearchIsland } from "./TagSearchIsland";

export const metadata: Metadata = buildStaticRouteMetadata("tags").metadata;

export default function TagsPage() {
  return (
    <>
      <PageHeader
        eyebrow="TAG SEARCH"
        title="태그로 모든 기록 찾기"
        description="프로젝트, Devlog, 개인일지와 교육일지를 태그와 검색어로 한 번에 찾아봅니다."
        marker="05"
      />
      <Suspense fallback={<div className="devlog-empty-state">태그 검색을 준비하고 있습니다.</div>}>
        <TagSearchIsland entries={buildTagSearchEntries()} />
      </Suspense>
    </>
  );
}
