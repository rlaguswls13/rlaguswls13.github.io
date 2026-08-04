import { JsonLd } from "@/lib/seo/JsonLd";
import { buildRootJsonLd } from "@/lib/seo/metadata";
import { buildRouteMetadata, buildStaticRouteMetadata, siteAuthor } from "@/lib/seo/routes";
import HomePageClient from "./HomePageClient";

const rootMetadata = buildStaticRouteMetadata("root");
const aboutMetadata = buildRouteMetadata("/about", "About", "About");
const rootJsonLd = buildRootJsonLd({
  siteName: "김현진 TECH LOG",
  siteUrl: rootMetadata.canonical,
  person: { name: siteAuthor, url: aboutMetadata.canonical },
});

export default function TechBlogHome() {
  return (
    <>
      <JsonLd id="website-json-ld" document={rootJsonLd.website} />
      <JsonLd id="person-json-ld" document={rootJsonLd.person} />
      <HomePageClient />
    </>
  );
}
