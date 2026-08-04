export type ListQueryState<TTab extends string, TSub extends string> = Readonly<{
  tab: TTab;
  sub: TSub;
  q: string;
  page: number;
}>;

type QueryInput = Readonly<{
  get(name: string): string | null;
}>;

type ListQueryConfig<
  TTabs extends readonly string[],
  TSubcategories extends readonly string[],
  TTabKey extends string,
> = Readonly<{
  pathname: string;
  tabKey: TTabKey;
  legacyTabKeys?: readonly string[];
  tabs: TTabs;
  subcategories: TSubcategories;
  defaultTab: TTabs[number];
  defaultSubcategory: TSubcategories[number];
}>;

function parsePage(value: string | null): number {
  if (value === null || !/^[1-9]\d*$/.test(value)) return 1;

  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

function normalizeSearch(value: string | undefined): string {
  return value?.trim() ?? "";
}

function normalizePage(value: number | undefined): number {
  return value !== undefined && Number.isSafeInteger(value) && value > 0 ? value : 1;
}

function safePageCount(totalItems: number, itemsPerPage: number): number {
  if (!Number.isSafeInteger(totalItems) || totalItems < 1) return 1;
  if (!Number.isSafeInteger(itemsPerPage) || itemsPerPage < 1) return 1;
  return Math.max(1, Math.ceil(totalItems / itemsPerPage));
}

export function createListQueryContract<
  const TTabs extends readonly string[],
  const TSubcategories extends readonly string[],
  const TTabKey extends string,
>(config: ListQueryConfig<TTabs, TSubcategories, TTabKey>) {
  type Tab = TTabs[number];
  type Subcategory = TSubcategories[number];
  type State = ListQueryState<Tab, Subcategory>;

  const isTab = (value: string): value is Tab => config.tabs.some((tab) => tab === value);
  const isSubcategory = (value: string): value is Subcategory => config.subcategories.some((subcategory) => subcategory === value);

  const parse = (input: QueryInput): State => {
    const canonicalTab = input.get(config.tabKey);
    const legacyTab = config.legacyTabKeys?.map((key) => input.get(key)).find((value) => value !== null) ?? null;
    const tabValue = canonicalTab ?? legacyTab;
    const tab = tabValue !== null && isTab(tabValue) ? tabValue : config.defaultTab;

    const canonicalSubcategory = input.get("sub");
    const legacySubcategory = input.get("pkg");
    const subcategoryValue = canonicalSubcategory ?? legacySubcategory;
    const sub = subcategoryValue !== null && isSubcategory(subcategoryValue)
      ? subcategoryValue
      : config.defaultSubcategory;

    return {
      tab,
      sub,
      q: normalizeSearch(input.get("q") ?? undefined),
      page: parsePage(input.get("page")),
    };
  };

  const normalize = (state: Partial<State>): State => ({
    tab: state.tab !== undefined && isTab(state.tab) ? state.tab : config.defaultTab,
    sub: state.sub !== undefined && isSubcategory(state.sub) ? state.sub : config.defaultSubcategory,
    q: normalizeSearch(state.q),
    page: normalizePage(state.page),
  });

  const serialize = (state: Partial<State>): string => {
    const normalized = normalize(state);
    const params = new URLSearchParams();

    if (normalized.tab !== config.defaultTab) params.set(config.tabKey, normalized.tab);
    if (normalized.sub !== config.defaultSubcategory) params.set("sub", normalized.sub);
    if (normalized.q) params.set("q", normalized.q);
    if (normalized.page > 1) params.set("page", String(normalized.page));

    return params.toString();
  };

  const href = (state: Partial<State>): string => {
    const query = serialize(state);
    return query ? `${config.pathname}?${query}` : config.pathname;
  };

  const clampPage = (page: number, totalItems: number, itemsPerPage: number): number => Math.min(normalizePage(page), safePageCount(totalItems, itemsPerPage));

  const pageHref = (state: Partial<State>, requestedPage: number, totalItems: number, itemsPerPage: number): string => href({
    ...normalize(state),
    page: clampPage(requestedPage, totalItems, itemsPerPage),
  });

  return { parse, serialize, href, clampPage, pageHref };
}

const devlogTabs = ["all", "tech_study", "problem_solving", "competition_event"] as const;
const devlogSubcategories = ["전체", "architecture", "book", "container", "event", "java", "messaging", "migration", "spring", "springboot", "storage", "was"] as const;
const journalTabs = ["all", "personal", "education"] as const;
const journalSubcategories = ["전체", "2026"] as const;
const projectTabs = ["all", "enterprise", "personal"] as const;
const projectSubcategories = ["전체"] as const;

export const devlogListQuery = createListQueryContract({
  pathname: "/devlog",
  tabKey: "tab",
  tabs: devlogTabs,
  subcategories: devlogSubcategories,
  defaultTab: "all",
  defaultSubcategory: "전체",
});

export const journalListQuery = createListQueryContract({
  pathname: "/journal",
  tabKey: "category",
  legacyTabKeys: ["journal"],
  tabs: journalTabs,
  subcategories: journalSubcategories,
  defaultTab: "all",
  defaultSubcategory: "전체",
});

export const projectListQuery = createListQueryContract({
  pathname: "/projects",
  tabKey: "tab",
  tabs: projectTabs,
  subcategories: projectSubcategories,
  defaultTab: "all",
  defaultSubcategory: "전체",
});
