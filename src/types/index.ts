export interface Skill {
  name: string;
  percent: number;
  icon: string;
}

export interface Project {
  id: string;
  source_id?: string;
  page_id?: string;
  last_edited_time?: string;
  slug?: string;
  sourceFile?: string;
  title: string;
  date?: string;
  periods: string[];
  tags: string[];
  description: string;
  type?: "enterprise" | "personal";
  category?: "enterprise" | "personal";
  subcategory?: string;
}

export interface ProjectSection {
  readonly title: string;
  readonly body: string | undefined;
  readonly list: readonly string[] | undefined;
}

export interface ProjectTab {
  readonly title: string;
  readonly sections: readonly ProjectSection[];
  readonly reference: string | undefined;
  readonly flow_diagram: string | undefined;
}

export interface ProjectDetail {
  readonly id: string;
  readonly project_id: string | undefined;
  readonly overview: string | undefined;
  readonly tech_stack: readonly string[];
  readonly sections: readonly ProjectSection[];
  readonly tabs: readonly ProjectTab[];
  readonly diagram: string | undefined;
  readonly reference: string | undefined;
  readonly flow_diagram: string | undefined;
}

export interface DevlogEntry {
  id: string;
  slug?: string;
  sourceId?: string;
  source_id?: string;
  page_id?: string;
  last_edited_time?: string;
  title: string;
  package?: string;
  date: string;
  tags: string[];
  description: string;
  round?: string;
  blogTitle?: string;
  impression?: string;
  notionUrl?: string;
  subcategory?: string;
}

export type DevlogCategory = "tech_study" | "problem_solving" | "competition_event" | "blog";
