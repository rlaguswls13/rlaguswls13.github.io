import { describe, expect, it } from "vitest";
import { inspectThumbnail, requiredThumbnailPath, validateThumbnail } from "../../scripts/thumbnail/thumbnail-contract.mjs";

function webpFixture() {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(22, 4);
  bytes.write("WEBP", 8, "ascii");
  bytes.write("VP8X", 12, "ascii");
  bytes.writeUInt32LE(10, 16);
  bytes[24] = 575 & 255;
  bytes[25] = 575 >> 8;
  bytes[27] = 383 & 255;
  bytes[28] = 383 >> 8;
  return bytes;
}

describe("thumbnail contract", () => {
  it("builds stable ID paths and accepts a 576x384 WebP", () => {
    const path = requiredThumbnailPath("devlog", "tech_study", "aa-bb");
    expect(path).toBe("public/thumnail/devlog/tech_study/aabb.webp");
    expect(validateThumbnail(webpFixture(), path)).toMatchObject({ valid: true, issues: [] });
  });

  it("reports missing assets as an ImageGen handoff", () => {
    const inspection = inspectThumbnail(null, "public/thumnail/projects/aabb.webp");
    expect(inspection.valid).toBe(false);
    expect(inspection.issues).toContain("missing");
    expect(inspection.action).toBe("imagegen");
  });
});
