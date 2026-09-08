import { parse } from "parse5";

export const listRouteContracts = [
  {
    route: "devlog",
    h1: "기술 학습과 문제 해결 기록",
    gridClass: "devlog-grid",
    cardClass: "devlog-card",
    linkClass: "devlog-card-link",
    // The /devlog page flattens categories in this fixed order before the
    // stable date sort, so same-date entries tie-break by it (see
    // src/app/devlog/page.tsx). The characterization test must replay the
    // same order or it disagrees with the exported HTML on ties.
    categoryOrder: ["tech_study", "tech_study_series", "problem_solving", "competition_event"],
    firstTitle: "스레드 풀 : 스레드 풀을 이용하는 이유?",
    visibleCount: 6,
  },
  {
    route: "journal",
    h1: "개인일지와 교육일지",
    gridClass: "devlog-grid",
    cardClass: "devlog-card",
    // Journal cards now use the JournalLog preview-card layout (full-card
    // modal trigger + a separate `education-blog-link`), so there is no
    // `devlog-card-link` anchor wrapping the card.
    linkClass: null,
    // Matches the category order in src/app/journal/page.tsx.
    categoryOrder: ["personal", "education"],
    firstTitle: "초보에서 주니어로 - 개발하는 습관에 대한 견해",
    visibleCount: 6,
  },
  {
    route: "projects",
    h1: "작업과 해결 과정",
    gridClass: "projects-grid",
    cardClass: "project-card",
    linkClass: null,
    firstTitle: "[JAVA] 레거시 코드로 인한 메모리 누수 해결 : 싱글톤 미적용, 병렬 스레드의 전역변수 사용",
    visibleCount: 6,
  },
];

function attribute(node, name) {
  return node.attrs?.find((candidate) => candidate.name === name)?.value ?? "";
}

function hasClass(node, className) {
  return attribute(node, "class").split(/\s+/u).includes(className);
}

function descendants(node) {
  const nodes = [];
  for (const child of node.childNodes ?? []) {
    nodes.push(child, ...descendants(child));
  }
  return nodes;
}

function textContent(node) {
  if (node.nodeName === "#text") return node.value;
  return (node.childNodes ?? []).map(textContent).join("");
}

export function inspectListHtml(html, contract) {
  const document = parse(html);
  const nodes = descendants(document);
  const heading = nodes.find((node) => node.tagName === "h1");
  const grid = nodes.find((node) => hasClass(node, contract.gridClass));
  const gridNodes = grid ? descendants(grid) : [];
  const cards = gridNodes.filter((node) => hasClass(node, contract.cardClass));
  const firstCard = cards[0];

  return {
    heading: heading ? textContent(heading).trim() : null,
    cardCount: cards.length,
    firstCardText: firstCard ? textContent(firstCard).replace(/\s+/gu, " ").trim() : null,
    firstCardStyle: firstCard ? attribute(firstCard, "style") : null,
    firstLinkClass: gridNodes.find((node) => node.tagName === "a")
      ? attribute(gridNodes.find((node) => node.tagName === "a"), "class")
      : null,
  };
}

export function requireMeaningfulListHtml(html, contract) {
  const result = inspectListHtml(html, contract);
  if (result.heading !== contract.h1) {
    throw new Error(`${contract.route}: missing H1 ${contract.h1}`);
  }
  if (!result.firstCardText?.includes(contract.firstTitle)) {
    throw new Error(`${contract.route}: missing first visible item ${contract.firstTitle}`);
  }
  return result;
}
