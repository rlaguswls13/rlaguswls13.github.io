const UTF8_BOM = 0xfeff;

function decodeUtf16Be(buffer) {
  const swapped = Buffer.allocUnsafe(buffer.length - 2);
  for (let index = 2; index + 1 < buffer.length; index += 2) {
    swapped[index - 2] = buffer[index + 1];
    swapped[index - 1] = buffer[index];
  }
  return swapped.toString("utf16le");
}

export function decodeText(input) {
  if (typeof input === "string") return input;
  if (!Buffer.isBuffer(input)) return String(input ?? "");
  if (input[0] === 0xff && input[1] === 0xfe) return input.subarray(2).toString("utf16le");
  if (input[0] === 0xfe && input[1] === 0xff) return decodeUtf16Be(input);
  return input.toString("utf8");
}

export function normalizeLineEndings(value) {
  return String(value || "")
    .replaceAll(String.fromCharCode(13, 10), String.fromCharCode(10))
    .replaceAll(String.fromCharCode(13), String.fromCharCode(10));
}

export function normalizeText(input, { trailingNewline = false } = {}) {
  let value = normalizeLineEndings(decodeText(input));
  if (value.charCodeAt(0) === UTF8_BOM) value = value.slice(1);
  value = value.normalize("NFC");
  if (trailingNewline) value = value.replace(/\\n*$/, "") + String.fromCharCode(10);
  return value;
}

export function readJsonText(input) {
  return JSON.parse(normalizeText(input));
}
