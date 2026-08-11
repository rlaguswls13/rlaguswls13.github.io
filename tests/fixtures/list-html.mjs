import { parse } from "parse5";

export const listRouteContracts = [
  {
    route: "devlog",
    h1: "기술 학습과 문제 해결 기록",
    gridClass: "devlog-grid",
    cardClass: "devlog-card",
    linkClass: "devlog-card-link",
    firstTitle: "개인 프로젝트 RAG 세팅 : Andrej Karpathy가 제안한 LLM Wiki",
    visibleCount: 6,
  },
  {
    route: "journal",
    h1: "개인일지와 교육일지",
    gridClass: "devlog-grid",
    cardClass: "devlog-card",
    linkClass: "devlog-card-link",
    firstTitle: "Messaging platform 통합 모듈 생성하다가, 기존소스 날리고 복구중",
    visibleCount: 6,
  },
  {
    route: "projects",
    h1: "작업과 해결 과정",
    gridClass: "projects-grid",
    cardClass: "project-card",
    linkClass: null,
    firstTitle: "레거시 코드로 인한 메모리 누수 해결",
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
