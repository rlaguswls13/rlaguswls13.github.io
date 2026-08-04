import { devlogListQuery } from "../../src/lib/list-query.js";

function printCanonicalHref(input: string): void {
  const parsedUrl = new URL(input);
  const state = devlogListQuery.parse(parsedUrl.searchParams);
  const result = {
    input,
    state,
    canonicalHref: devlogListQuery.href(state),
    filteredPageHref: devlogListQuery.pageHref(state, state.page, 7, 6),
  };

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const input = process.argv[2];

if (input === undefined) {
  throw new Error("Expected one absolute list URL argument.");
}

printCanonicalHref(input);
