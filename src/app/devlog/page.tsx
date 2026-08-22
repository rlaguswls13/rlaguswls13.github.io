import type { Metadata } from "next";
import devlogData from "@/data/indexes/devlog.json";
import { PageHeader } from "@/components/layout/PageHeader";
import { sortByDateDesc } from "@/lib/utils";
import type { DevlogCategory, DevlogEntry } from "@/types";
import { DevlogListIsland } from "./DevlogListIsland";
import { buildStaticRouteMetadata } from "@/lib/seo/routes";

export const metadata: Metadata = buildStaticRouteMetadata("devlog").metadata;

type CoreCategory = Exclude<DevlogCategory, "blog">;
type DisplayEntry = DevlogEntry & { category: CoreCategory };

const categories: readonly CoreCategory[] = ["tech_study", "problem_solving", "competition_event"];
const indexedEntries = devlogData as Record<CoreCategory, DevlogEntry[]>;
const entries = sortByDateDesc<DisplayEntry>(categories.flatMap((category) =>
  (indexedEntries[category] ?? []).map((entry) => ({ ...entry, category })),
));

export default function DevlogPage() {
  return (
    <>
      <PageHeader
        eyebrow="ENGINEERING LOG"
        title="기술 학습과 문제 해결 기록"
        description="학습한 기술과 실무 문제를 분석하고 해결한 과정을 기록합니다."
        marker="03"
      />
      <DevlogListIsland entries={entries} initialEntries={entries.slice(0, 6)} />
    </>
  );
}
