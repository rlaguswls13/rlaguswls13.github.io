import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function publishAdsTxt(outputDirectory, adsenseAccount) {
  if (!adsenseAccount) return;
  const publisherId = adsenseAccount.startsWith("ca-") ? adsenseAccount.slice(3) : adsenseAccount;
  writeFileSync(
    path.join(outputDirectory, "ads.txt"),
    `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`,
    "utf8",
  );
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  publishAdsTxt(
    path.resolve(process.env.PAGES_OUTPUT_DIRECTORY || "out"),
    process.env.ADSENSE_ACCOUNT || "",
  );
}
