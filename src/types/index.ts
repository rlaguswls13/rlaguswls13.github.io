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

interface ProjectSection {
  title: string;
  body?: string;
  list?: string[];
}

interface ProjectTab {
  title: string;
  sections: ProjectSection[];
  reference?: string;
  flow_diagram?: string;
}

export interface ProjectDetail {
  id: string;
  project_id?: string;
  overview?: string;
  tech_stack?: string[];
  sections?: ProjectSection[];
  tabs?: ProjectTab[];
  diagram?: string;
  reference?: string;
  flow_diagram?: string;
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
