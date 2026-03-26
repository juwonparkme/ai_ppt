import path from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = path.resolve(TEMPLATE_DIR, "../../assets");

export const SLIDE_W = 13.333;
export const SLIDE_H = 7.5;

export function templateAssetPath(templateName: string, fileName: string) {
  return path.join(ASSET_DIR, templateName, fileName);
}
