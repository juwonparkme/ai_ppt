import path from "node:path";

import { renderPresentation } from "./render.js";

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return "";
  }
  return process.argv[index + 1] ?? "";
}

async function main() {
  const command = process.argv[2];
  if (command !== "render") {
    throw new Error("Usage: npm run render -- --input <spec.json> --output <file.pptx>");
  }

  const inputPath = readArg("--input");
  const outputPath = readArg("--output");

  if (!inputPath || !outputPath) {
    throw new Error("Missing --input or --output");
  }

  const result = await renderPresentation(path.resolve(inputPath), path.resolve(outputPath));
  process.stdout.write(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
