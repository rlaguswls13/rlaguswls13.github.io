import path from "node:path";

const ID_PATTERN = /^[a-z0-9]+$/iu;

export function requiredThumbnailPath(type, category, id) {
  const normalizedId = String(id || "").replaceAll("-", "").toLowerCase();
  if (!ID_PATTERN.test(normalizedId)) throw new Error(`Invalid thumbnail source ID: ${id}`);
  if (type === "projects") return path.posix.join("public", "thumnail", "projects", `${normalizedId}.webp`);
  if (type === "devlog") {
    if (!category) throw new Error("Devlog thumbnail category is required.");
    const normalizedCategory = String(category).normalize("NFKC").trim();
    if (!/^[a-z0-9_-]+$/iu.test(normalizedCategory)) throw new Error(`Invalid thumbnail category: ${category}`);
    return path.posix.join("public", "thumnail", "devlog", normalizedCategory, `${normalizedId}.webp`);
  }
  throw new Error(`Unsupported thumbnail type: ${type}`);
}

function readWebpDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  if (buffer.readUInt32LE(4) + 8 > buffer.length) return null;
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buffer.length >= 30) {
    const width = 1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16);
    const height = 1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16);
    return { width, height };
  }
  if (chunk === "VP8 " && buffer.length >= 34 && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    return {
      width: 1 + buffer[21] + ((buffer[22] & 0x3f) << 8),
      height: 1 + ((buffer[22] >> 6) | (buffer[23] << 2) | ((buffer[24] & 0x0f) << 10)),
    };
  }
  return null;
}

export function inspectThumbnail(buffer, relativePath) {
  const issues = [];
  if (!buffer) return { valid: false, issues: ["missing"], action: "imagegen" };
  if (!String(relativePath).toLowerCase().endsWith(".webp")) issues.push("format");
  const dimensions = readWebpDimensions(buffer);
  if (!dimensions) issues.push("invalid-webp");
  else if (dimensions.width !== 576 || dimensions.height !== 384) issues.push("dimensions");
  return { valid: issues.length === 0, issues, action: issues.length === 0 ? "accept" : "imagegen" };
}

export function validateThumbnail(buffer, relativePath) {
  return inspectThumbnail(buffer, relativePath);
}
