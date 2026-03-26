import type { PresentationSpec, SlideSpec } from "../spec.js";

type PptxInstance = any;
type PptxSlide = any;

const COLORS = {
  bg: "F2E7DC",
  text: "1E1714",
  accent: "D52B07",
  dark: "251A17",
  soft: "E8D8CC",
};

function addBackground(slide: PptxSlide) {
  slide.background = { color: COLORS.bg };
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 1.25,
    h: 7.5,
    fill: { color: COLORS.dark, transparency: 8 },
    line: { color: COLORS.dark, transparency: 100 },
  });
  slide.addShape("rect", {
    x: 11.85,
    y: 0,
    w: 1.48,
    h: 7.5,
    fill: { color: COLORS.dark, transparency: 8 },
    line: { color: COLORS.dark, transparency: 100 },
  });
  slide.addShape("ellipse", {
    x: -0.65,
    y: 5.35,
    w: 2.8,
    h: 2.2,
    fill: { color: COLORS.soft, transparency: 14 },
    line: { color: COLORS.soft, transparency: 100 },
  });
  slide.addShape("ellipse", {
    x: 10.95,
    y: -0.35,
    w: 2.6,
    h: 2,
    fill: { color: COLORS.soft, transparency: 22 },
    line: { color: COLORS.soft, transparency: 100 },
  });
}

function addFooter(slide: PptxSlide, index: number) {
  slide.addText(String(index + 1).padStart(2, "0"), {
    x: 11.75,
    y: 6.82,
    w: 0.75,
    h: 0.22,
    align: "right",
    fontFace: "Aptos",
    fontSize: 10,
    bold: true,
    color: COLORS.accent,
    margin: 0,
  });
}

function addEditorialBullets(slide: PptxSlide, items: string[], y: number, h: number) {
  slide.addText(
    items.length
      ? items.map((item) => ({
          text: item,
          options: { bullet: { indent: 14 } },
        }))
      : [{ text: "" }],
    {
      x: 1.1,
      y,
      w: 10.6,
      h,
      fontFace: "Aptos",
      fontSize: 20,
      color: COLORS.text,
      breakLine: true,
      paraSpaceAfterPt: 14,
      margin: 0,
      valign: "top",
      fit: "shrink",
    },
  );
}

function renderTitleSlide(slide: PptxSlide, spec: PresentationSpec, item: SlideSpec, index: number) {
  addBackground(slide);
  slide.addText(item.title.toUpperCase(), {
    x: 1.0,
    y: 0.65,
    w: 11.2,
    h: 3.6,
    fontFace: "Aptos Display",
    bold: true,
    fontSize: 42,
    color: COLORS.accent,
    align: "center",
    valign: "mid",
    breakLine: true,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(item.subtitle || spec.metadata.topic || "", {
    x: 1.2,
    y: 5.95,
    w: 4.2,
    h: 0.5,
    fontFace: "Aptos",
    fontSize: 12,
    bold: true,
    color: COLORS.accent,
    margin: 0,
    fit: "shrink",
  });
  slide.addText("PRESENTED BY AI PPT", {
    x: 8.55,
    y: 5.95,
    w: 3.6,
    h: 0.5,
    fontFace: "Aptos",
    fontSize: 12,
    bold: true,
    color: COLORS.accent,
    margin: 0,
    align: "right",
  });
  addFooter(slide, index);
}

function renderListSlide(slide: PptxSlide, _spec: PresentationSpec, item: SlideSpec, index: number) {
  addBackground(slide);
  slide.addText(item.title.toUpperCase(), {
    x: 1.0,
    y: 0.75,
    w: 7.8,
    h: 1.1,
    fontFace: "Aptos Display",
    bold: true,
    fontSize: 27,
    color: COLORS.accent,
    margin: 0,
    fit: "shrink",
  });
  slide.addShape("line", {
    x: 1.05,
    y: 1.95,
    w: 10.8,
    h: 0,
    line: { color: COLORS.accent, pt: 1.1, transparency: 30 },
  });
  addEditorialBullets(slide, item.bullets, 2.3, 3.9);
  addFooter(slide, index);
}

export function renderModernB(pptx: PptxInstance, spec: PresentationSpec) {
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
