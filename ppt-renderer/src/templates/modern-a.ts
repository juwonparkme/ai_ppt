import PptxGenJS from "pptxgenjs";

import type { PresentationSpec, SlideSpec } from "../spec.js";

type PptxInstance = any;
type PptxSlide = any;

const COLORS = {
  bg: "F4F1EA",
  panel: "FFFFFF",
  text: "1E1E1E",
  accent: "1C5D99",
  accentSoft: "D8E7F5",
  muted: "667085",
};

function addChrome(slide: PptxSlide, spec: PresentationSpec, index: number) {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 13.33,
    h: 7.5,
    fill: { color: COLORS.bg },
    line: { color: COLORS.bg },
  });
  slide.addShape("rect", {
    x: 0.4,
    y: 0.35,
    w: 12.53,
    h: 6.8,
    radius: 0.12,
    fill: { color: COLORS.panel },
    line: { color: "E7E2D9", pt: 1 },
  });
  slide.addText(spec.title, {
    x: 0.7,
    y: 0.35,
    w: 8.8,
    h: 0.35,
    fontFace: "Aptos",
    fontSize: 10,
    color: COLORS.muted,
    margin: 0,
  });
  slide.addText(String(index + 1).padStart(2, "0"), {
    x: 11.8,
    y: 6.72,
    w: 0.8,
    h: 0.2,
    align: "right",
    fontFace: "Aptos",
    fontSize: 11,
    color: COLORS.muted,
    margin: 0,
  });
}

function addBulletList(slide: PptxSlide, items: string[], y: number, h: number) {
  slide.addText(
    items.length
      ? items.map((item) => ({
          text: item,
          options: { bullet: { indent: 18 } },
        }))
      : [{ text: "" }],
    {
      x: 0.95,
      y,
      w: 10.8,
      h,
      fontFace: "Aptos",
      fontSize: 21,
      color: COLORS.text,
      breakLine: true,
      paraSpaceAfterPt: 16,
      valign: "top",
      margin: 0,
    },
  );
}

function renderTitleSlide(
  slide: PptxSlide,
  spec: PresentationSpec,
  item: SlideSpec,
  index: number,
) {
  addChrome(slide, spec, index);
  slide.addShape("rect", {
    x: 0.75,
    y: 1.0,
    w: 2.1,
    h: 0.22,
    fill: { color: COLORS.accent },
    line: { color: COLORS.accent },
  });
  slide.addText(item.title, {
    x: 0.9,
    y: 1.45,
    w: 10.7,
    h: 1.5,
    fontFace: "Aptos Display",
    bold: true,
    fontSize: 26,
    color: COLORS.text,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(item.subtitle || spec.metadata.topic || "", {
    x: 0.95,
    y: 3.2,
    w: 8.8,
    h: 1.2,
    fontFace: "Aptos",
    fontSize: 18,
    color: COLORS.muted,
    margin: 0,
    fit: "shrink",
  });
  slide.addShape("rect", {
    x: 9.85,
    y: 1.25,
    w: 2.2,
    h: 2.2,
    radius: 0.18,
    fill: { color: COLORS.accentSoft },
    line: { color: COLORS.accentSoft },
  });
}

function renderListSlide(
  slide: PptxSlide,
  spec: PresentationSpec,
  item: SlideSpec,
  index: number,
) {
  addChrome(slide, spec, index);
  slide.addText(item.title, {
    x: 0.92,
    y: 0.95,
    w: 8.5,
    h: 0.65,
    fontFace: "Aptos Display",
    bold: true,
    fontSize: 24,
    color: COLORS.text,
    margin: 0,
  });
  slide.addShape("line", {
    x: 0.92,
    y: 1.68,
    w: 11.0,
    h: 0,
    line: { color: "D8DDE3", pt: 1.2 },
  });
  addBulletList(slide, item.bullets, 1.98, 4.8);
}

export function renderModernA(pptx: PptxInstance, spec: PresentationSpec) {
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Codex";
  pptx.company = "juwonparkme";
  pptx.subject = spec.title;
  pptx.title = spec.title;
  pptx.lang = spec.language;
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
    lang: spec.language,
  };

  spec.slides.forEach((item, index) => {
    const slide = pptx.addSlide();
    if (item.kind === "title") {
      renderTitleSlide(slide, spec, item, index);
      return;
    }
    renderListSlide(slide, spec, item, index);
  });
}
