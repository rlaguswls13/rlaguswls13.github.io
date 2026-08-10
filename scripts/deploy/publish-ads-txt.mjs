import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export function publishAdsTxt(outputDirectory, adsenseAccount) {
  const outputPath = path.join(outputDirectory, "ads.txt");
  if (!adsenseAccount) {
    rmSync(outputPath, { force: true });
    return;
  }
  const publisherId = adsenseAccount.startsWith("ca-") ? adsenseAccount.slice(3) : adsenseAccount;
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    outputPath,
    `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`,
    "utf8",
  );
}
