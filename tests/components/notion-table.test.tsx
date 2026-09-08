import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NotionTable } from "../../src/components/ui/notion/NotionTable";

const html = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

describe("NotionTable", () => {
  it("Given a Notion tbody-only table When rendered Then the first row becomes a semantic thead", () => {
    const out = html(
      <NotionTable>
        <tbody>
          <tr><td>구분</td><td>도커</td></tr>
          <tr><td>권한 제어</td><td>실행 옵션</td></tr>
        </tbody>
      </NotionTable>,
    );
    expect(out).toContain('<thead><tr><th scope="col">구분</th><th scope="col">도커</th></tr></thead>');
    expect(out).toContain("<tbody><tr><td>권한 제어</td><td>실행 옵션</td></tr></tbody>");
    // the promoted row must not also appear as a data row
    expect(out.match(/구분/g)).toHaveLength(1);
  });

  it("Given a legacy table that already has a thead When rendered Then the header and every data row survive untouched", () => {
    const out = html(
      <NotionTable>
        <thead><tr><th>방식</th><th>특징</th></tr></thead>
        <tbody>
          <tr><td>DAS</td><td>직결</td></tr>
          <tr><td>NAS</td><td>파일</td></tr>
        </tbody>
      </NotionTable>,
    );
    expect(out).toContain("<thead><tr><th>방식</th><th>특징</th></tr></thead>");
    expect(out).toContain("<td>DAS</td>");
    expect(out).toContain("<td>NAS</td>");
    // no synthesized second thead, no dropped row
    expect(out.match(/<thead>/g)).toHaveLength(1);
    expect(out.match(/<tr>/g)).toHaveLength(3);
  });

  it("Given a header cell that is a component rather than a td When rendered Then it is passed through, not wrapped in th", () => {
    const out = html(
      <NotionTable>
        <tbody>
          <tr><td>이름</td><span>커스텀</span></tr>
          <tr><td>값</td><td>1</td></tr>
        </tbody>
      </NotionTable>,
    );
    expect(out).toContain('<th scope="col">이름</th>');
    expect(out).toContain("<span>커스텀</span>");
  });
});
