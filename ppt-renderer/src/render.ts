import fs from "node:fs/promises";
import path from "node:path";

import PptxGenJS from "pptxgenjs";

import { presentationSpecSchema, type PresentationSpec } from "./spec.js";
import { renderModernA } from "./templates/modern-a.js";
import { renderModernB } from "./templates/modern-b.js";

type PptxInstance = any;

export async function renderPresentation(inputPath: string, outputPath: string) {
  const raw = await fs.readFile(inputPath, "utf8");
  const spec = presentationSpecSchema.parse(JSON.parse(raw));
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const PptxCtor = PptxGenJS as unknown as new () => PptxInstance;
  const pptx = new PptxCtor();
  renderByTemplate(pptx, spec);
  await pptx.writeFile({ fileName: outputPath });

  return {
    outputPath,
    slideCount: spec.slides.length,
    template: spec.template,
    title: spec.title,
  };
}

function renderByTemplate(pptx: PptxInstance, spec: PresentationSpec) {
  switch (spec.template) {
    case "modern-a":
      renderModernA(pptx, spec);
      return;
    case "modern-b":
      renderModernB(pptx, spec);
      return;
    default:
      throw new Error(`Unsupported template: ${spec.template}`);
  }
}
