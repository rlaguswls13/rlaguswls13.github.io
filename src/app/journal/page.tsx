import journalData from "@/data/indexes/journal.json";
import { PageHeader } from "@/components/layout/PageHeader";
import { sortByDateDesc } from "@/lib/utils";
import type { DevlogEntry } from "@/types";
import { JournalListIsland } from "./JournalListIsland";

type JournalCategory = "personal" | "education";
type JournalDisplayEntry = DevlogEntry & { journalCategory: JournalCategory };

const categories: readonly JournalCategory[] = ["personal", "education"];
const indexedEntries = journalData as Record<JournalCategory, DevlogEntry[]>;
const entries = sortByDateDesc<JournalDisplayEntry>(categories.flatMap((journalCategory) =>
  indexedEntries[journalCategory].map((entry) => ({ ...entry, journalCategory })),
));

export default function JournalPage() {
  return (
    <>
      <PageHeader
        eyebrow="PERSONAL JOURNAL"
        title="개인일지와 교육일지"
        description="일상의 생각과 교육 과정에서 배운 내용을 기록합니다."
        marker="04"
      />
      <JournalListIsland entries={entries} initialEntries={entries.slice(0, 6)} />
    </>
  );
}
