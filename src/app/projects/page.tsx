import type { Metadata } from "next";
import projectsData from "@/data/indexes/projects.json";
import { sortByDateDesc } from "@/lib/utils";
import type { Project } from "@/types";
import { ProjectsListIsland } from "./ProjectsListIsland";
import { buildStaticRouteMetadata } from "@/lib/seo/routes";

export const metadata: Metadata = buildStaticRouteMetadata("projects").metadata;

const projects = sortByDateDesc(projectsData.projects as Project[]);

export default function ProjectsPage() {
  return (
    <ProjectsListIsland projects={projects} initialProjects={projects.slice(0, 6)} />
  );
}
