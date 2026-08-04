import { serializeJsonLd, type JsonLdDocument } from "./metadata";

export function JsonLd({ id, document }: { readonly id: string; readonly document: JsonLdDocument }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(document) }}
    />
  );
}
