import devlogData from "@/data/indexes/devlog.json";
import journalData from "@/data/indexes/journal.json";
import projectsData from "@/data/indexes/projects.json";
import { getDevlogHref } from "@/lib/devlog-slugs";
import type { DevlogEntry, Project } from "@/types";

export type TagSearchCategory = "project" | "devlog" | "journal";

export type TagSearchEntry = Readonly<{
  id: string;
  title: string;
  date: string;
  description: string;
  tags: readonly string[];
  href: string;
  category: TagSearchCategory;
  categoryLabel: string;
  subcategoryLabel: string;
}>;

const journalCategories = ["personal", "education"] as const;
const devlogCategories = ["tech_study", "problem_solving", "competition_event"] as const;

const categoryLabels: Record<TagSearchCategory, string> = {
  project: "프로젝트",
  devlog: "Devlog",
  journal: "일지",
};

const devlogSubcategoryLabels: Record<(typeof devlogCategories)[number], string> = {
  tech_study: "기술 학습",
  problem_solving: "문제 해결",
  competition_event: "대회·행사",
};

const journalSubcategoryLabels: Record<(typeof journalCategories)[number], string> = {
  personal: "개인일지",
  education: "교육일지",
};

function normalizeTags(tags: readonly string[] | undefined): readonly string[] {
  return [...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean))];
}

function toDevlogEntry(
  entry: DevlogEntry,
  category: (typeof devlogCategories)[number],
): TagSearchEntry {
  return {
    id: entry.id,
    title: entry.title,
    date: entry.date,
    description: entry.description,
    tags: normalizeTags(entry.tags),
    href: getDevlogHref(category, entry.id),
    category: "devlog",
    categoryLabel: categoryLabels.devlog,
    subcategoryLabel: devlogSubcategoryLabels[category],
  };
}

function toJournalEntry(
  entry: DevlogEntry,
  category: (typeof journalCategories)[number],
): TagSearchEntry {
  return {
    id: entry.id,
    title: entry.title,
    date: entry.date,
    description: entry.description,
    tags: normalizeTags(entry.tags),
    href: getDevlogHref(category, entry.id),
    category: "journal",
    categoryLabel: categoryLabels.journal,
    subcategoryLabel: journalSubcategoryLabels[category],
  };
}

function toProjectEntry(project: Project): TagSearchEntry {
  return {
    id: project.id,
    title: project.title,
    date: project.date || "",
    description: project.description,
    tags: normalizeTags(project.tags),
    href: `/projects/${project.slug || project.id}`,
    category: "project",
    categoryLabel: categoryLabels.project,
    subcategoryLabel: project.category === "personal" ? "토이프로젝트" : "참여 작업",
  };
}

function compareDates(left: TagSearchEntry, right: TagSearchEntry): number {
  return right.date.localeCompare(left.date) || left.title.localeCompare(right.title, "ko");
}

export function buildTagSearchEntries(): readonly TagSearchEntry[] {
  const devlogEntries = devlogCategories.flatMap((category) =>
    ((devlogData[category] as DevlogEntry[] | undefined) ?? []).map((entry) => toDevlogEntry(entry, category)),
  );
  const journalEntries = journalCategories.flatMap((category) =>
    ((journalData[category] as DevlogEntry[] | undefined) ?? []).map((entry) => toJournalEntry(entry, category)),
  );
  const projectEntries = (projectsData.projects as Project[]).map(toProjectEntry);

  return [...projectEntries, ...devlogEntries, ...journalEntries]
    .filter((entry) => entry.tags.length > 0)
    .sort(compareDates);
}
