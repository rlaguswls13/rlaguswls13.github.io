import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({ adsenseAccount: "ca-pub-9876543210123456" as string | null }));

vi.mock("@/components/layout/Navbar", () => ({ Navbar: () => null }));
vi.mock("@/components/layout/ThemeProvider", () => ({
  ThemeProvider: ({ children }: { readonly children: React.ReactNode }) => children,
}));
vi.mock("@blog/ga4-analytics/react", () => ({ GoogleAnalytics: () => null }));
vi.mock("@/lib/site", () => ({
  siteConfig: {
    siteUrl: "https://example.com",
    google: config,
    naver: {},
  },
}));

describe("AdSense root layout", () => {
  it("loads the configured publisher script once in the head when configured", async () => {
    // Given: a build with a publisher distinct from the production account.
    const { default: RootLayout } = await import("../../src/app/layout");

    // When: the shared page layout renders.
    const html = renderToStaticMarkup(<RootLayout><main>Content</main></RootLayout>);
    const head = html.split("</head>")[0] ?? "";

    // Then: the asynchronous anonymous script uses that publisher exactly once.
    const scripts = head.match(/<script[^>]*src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*>/g);
    expect(scripts).toHaveLength(1);
    expect(scripts?.[0]).toContain("client=ca-pub-9876543210123456");
    expect(scripts?.[0]).toMatch(/\basync(?:="")?/);
    expect(scripts?.[0]).toMatch(/crossorigin="anonymous"/i);
  });

  it("omits the advertising script when no publisher is configured", async () => {
    // Given: a build without AdSense configuration.
    config.adsenseAccount = null;
    vi.resetModules();
    const { default: RootLayout } = await import("../../src/app/layout");

    // When: the shared page layout renders.
    const html = renderToStaticMarkup(<RootLayout><main>Content</main></RootLayout>);

    // Then: no advertising loader is emitted.
    expect(html).not.toContain("adsbygoogle.js");
  });
});
