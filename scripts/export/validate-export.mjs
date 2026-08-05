import path from "node:path";
import { ExportValidationError, validateStaticExport } from "./inspector.mjs";

const root = process.cwd();
const reportPath = process.env.EXPORT_REPORT_PATH ?? path.join(root, "artifacts", "export-report.json");

try {
  const report = await validateStaticExport({ root, reportPath });
  console.log(JSON.stringify(report));
} catch (error) {
  if (error instanceof ExportValidationError) {
    console.error(JSON.stringify(error.report));
    process.exitCode = 1;
  } else {
    throw error;
  }
}
