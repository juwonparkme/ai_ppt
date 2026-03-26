import PptxGenJS from "pptxgenjs";

import type { PresentationSpec, SlideSpec } from "../spec.js";

type PptxInstance = any;
type PptxSlide = any;

const COLORS = {
  bg: "BFD4E8",
  panel: "FFFFFF",
  text: "201C1F",
  accent: "7F9AB2",
  accentSoft: "DDE9F3",
  muted: "6D737A",
  line: "9EB6CB",
};

function addChrome(slide: PptxSlide, spec: PresentationSpec, index: number) {
  slide.background = { color: COLORS.bg };
  slide.addShape("rect", {
    x: 0.24,
    y: 0.28,
    w: 12.85,
    h: 6.55,
    radius: 0.18,
    fill: { color: COLORS.panel },
    line: { color: COLORS.panel, transparency: 100 },
  });
  slide.addShape("rect", {
    x: 4.05,
    y: 0.1,
    w: 5.2,
    h: 0.52,
    radius: 0.14,
    fill: { color: COLORS.bg },
    line: { color: COLORS.bg },
  });
  slide.addText("BUSINESS PRESENTATION", {
    x: 4.2,
    y: 0.2,
    w: 4.9,
    h: 0.22,
    align: "center",
    fontFace: "Aptos",
    fontSize: 12,
    bold: false,
    color: COLORS.muted,
    margin: 0,
  });
  slide.addText(String(index + 1).padStart(2, "0"), {
    x: 11.55,
    y: 6.38,
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
      x: 1.1,
      y,
      w: 10.35,
      h,
      fontFace: "Aptos",
      fontSize: 19,
      color: COLORS.text,
      breakLine: true,
      paraSpaceAfterPt: 14,
      valign: "top",
      margin: 0,
      fit: "shrink",
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
  slide.addText(item.title, {
    x: 1.65,
    y: 2.0,
    w: 10.0,
    h: 1.1,
    fontFace: "Aptos Display",
    bold: true,
    fontSize: 34,
    color: COLORS.text,
    margin: 0,
    align: "center",
    fit: "shrink",
  });
  slide.addText(item.subtitle || spec.metadata.topic || "", {
    x: 1.95,
    y: 3.3,
    w: 9.4,
    h: 1.1,
    fontFace: "Aptos",
    fontSize: 30,
    bold: true,
    color: COLORS.accent,
    margin: 0,
    align: "center",
    fit: "shrink",
  });
  slide.addShape("line", {
    x: 1.0,
    y: 5.7,
    w: 11.35,
    h: 0,
    line: { color: COLORS.line, pt: 1.1 },
  });
  slide.addText(spec.title, {
    x: 1.25,
    y: 6.0,
    w: 7.5,
    h: 0.28,
    fontFace: "Aptos",
    fontSize: 11,
    color: COLORS.muted,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(spec.metadata.topic || "", {
    x: 8.0,
    y: 6.0,
    w: 3.9,
    h: 0.28,
    fontFace: "Aptos",
    fontSize: 11,
    color: COLORS.muted,
    margin: 0,
    align: "right",
    fit: "shrink",
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
    x: 1.0,
    y: 1.0,
    w: 8.9,
    h: 0.65,
    fontFace: "Aptos Display",
    bold: true,
    fontSize: 23,
    color: COLORS.text,
    margin: 0,
    fit: "shrink",
  });
  slide.addShape("line", {
    x: 1.0,
    y: 1.72,
    w: 11.2,
    h: 0,
    line: { color: COLORS.line, pt: 1.1 },
  });
  addBulletList(slide, item.bullets, 2.05, 3.95);
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
