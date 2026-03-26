import type { PresentationSpec, SlideSpec } from "../spec.js";
import { SLIDE_H, SLIDE_W, templateAssetPath } from "./assets.js";

type PptxInstance = any;
type PptxSlide = any;

const COLORS = {
  bg: "EFEFEF",
  orange: "E03408",
  paper: "F6F6F2",
  ink: "262321",
  white: "FFFFFF",
};

const IMAGES = {
  cover: templateAssetPath("modern-a", "page-01-img-01.jpg"),
  introFur: templateAssetPath("modern-a", "page-03-img-01.jpg"),
  splitModel: templateAssetPath("modern-a", "page-04-img-01.jpg"),
  splitTexture: templateAssetPath("modern-a", "page-04-img-02.jpg"),
  vase: templateAssetPath("modern-a", "page-05-img-01.png"),
  hide: templateAssetPath("modern-a", "page-06-img-01.jpg"),
  shirt: templateAssetPath("modern-a", "page-06-img-02.jpg"),
  path: templateAssetPath("modern-a", "page-06-img-03.jpg"),
  bottle: templateAssetPath("modern-a", "page-07-img-01.jpg"),
  redPortrait: templateAssetPath("modern-a", "page-07-img-02.jpg"),
  cactus: templateAssetPath("modern-a", "page-08-img-01.png"),
  leather: templateAssetPath("modern-a", "page-09-img-01.jpg"),
  heels: templateAssetPath("modern-a", "page-10-img-01.jpg"),
  glass: templateAssetPath("modern-a", "page-10-img-02.jpg"),
};

function setPaperBackground(slide: PptxSlide) {
  slide.background = { color: COLORS.bg };
}

function fillImage(slide: PptxSlide, imagePath: string, x = 0, y = 0, w = SLIDE_W, h = SLIDE_H) {
  slide.addImage({ path: imagePath, x, y, w, h });
}

function addSectionNumber(slide: PptxSlide, index: number, color = COLORS.orange) {
  slide.addText(`(${index})`, {
    x: 0.86,
    y: 5.95,
    w: 1.24,
    h: 0.58,
    fontFace: "Arial",
    fontSize: 34,
    bold: true,
    color,
    margin: 0,
  });
}

function safeTitle(text: string) {
  return text || "SECTION";
}

function asParagraph(item: SlideSpec, fallback = "") {
  const parts = [item.subtitle, ...item.bullets].filter(Boolean);
  if (!parts.length) {
    return fallback;
  }
  return parts.join(" ");
}

function ensureItems(items: string[], count: number, fallbackPrefix: string) {
  const picked = items.filter(Boolean).slice(0, count);
  while (picked.length < count) {
    picked.push(`${fallbackPrefix} ${picked.length + 1}`);
  }
  return picked;
}

function upperIfAscii(text: string) {
  return /^[\x00-\x7F\s.,:;!?&'()/-]+$/.test(text) ? text.toUpperCase() : text;
}

function addBodyText(slide: PptxSlide, text: string, opts: Record<string, any>) {
  slide.addText(text, {
    fontFace: "Arial",
    fontSize: 12,
    color: COLORS.ink,
    margin: 0,
    fit: "shrink",
    ...opts,
  });
}

function addBulletList(slide: PptxSlide, items: string[], opts: Record<string, any>) {
  slide.addText(
    items.map((item) => ({
      text: item,
      options: { bullet: { indent: 16 } },
    })),
    {
      fontFace: "Arial",
      fontSize: 12,
      color: COLORS.ink,
      breakLine: true,
      paraSpaceAfterPt: 10,
      margin: 0,
      fit: "shrink",
      valign: "top",
      ...opts,
    },
  );
}

function renderTitleSlide(slide: PptxSlide, spec: PresentationSpec, item: SlideSpec) {
  fillImage(slide, IMAGES.cover);
  slide.addText(upperIfAscii(item.title || spec.title), {
    x: 0.72,
    y: 0.46,
    w: 11.82,
    h: 3.9,
    fontFace: "Arial",
    fontSize: 58,
    bold: true,
    color: COLORS.orange,
    align: "center",
    valign: "mid",
    breakLine: true,
    margin: 0,
    fit: "shrink",
  });
  slide.addText("AI PPT STUDIO", {
    x: 0.88,
    y: 6.62,
    w: 2.05,
    h: 0.36,
    fontFace: "Arial",
    fontSize: 12,
    bold: true,
    color: COLORS.orange,
    margin: 0,
  });
  slide.addText(item.subtitle || spec.metadata.topic || "PRESENTED BY JUWON PARK", {
    x: 10.26,
    y: 6.62,
    w: 2.15,
    h: 0.36,
    fontFace: "Arial",
    fontSize: 12,
    bold: true,
    color: COLORS.orange,
    margin: 0,
    align: "right",
    fit: "shrink",
  });
}

function renderTocSlide(slide: PptxSlide, spec: PresentationSpec, item: SlideSpec) {
  setPaperBackground(slide);
  const detailSlides = spec.slides.filter((item) => item.kind !== "title" && item.kind !== "toc");
  const sourceItems = item.bullets.length
    ? item.bullets.map(upperIfAscii)
    : detailSlides.map((detailItem) => upperIfAscii(detailItem.title));
  const items = ensureItems(sourceItems, 6, "SECTION");
  const captions = ensureItems(detailSlides.map((item) => asParagraph(item)).filter(Boolean), 6, "핵심 메시지");

  items.forEach((text, index) => {
    const y = 1.0 + index * 0.78;
    slide.addText(`(${index + 1})`, {
      x: 0.82,
      y,
      w: 1.2,
      h: 0.48,
      fontFace: "Arial",
      fontSize: 34,
      bold: true,
      color: COLORS.orange,
      margin: 0,
    });
    slide.addText(text, {
      x: 2.18,
      y: y - 0.02,
      w: 7.92,
      h: 0.52,
      fontFace: "Arial",
      fontSize: 34,
      bold: true,
      color: COLORS.orange,
      margin: 0,
      fit: "shrink",
    });
    slide.addText(captions[index], {
      x: 10.28,
      y: y + 0.08,
      w: 1.95,
      h: 0.34,
      fontFace: "Arial",
      fontSize: 10,
      bold: true,
      color: COLORS.orange,
      align: "right",
      margin: 0,
      fit: "shrink",
    });
    slide.addShape("line", {
      x: 0,
      y: y + 0.52,
      w: SLIDE_W,
      h: 0,
      line: { color: COLORS.orange, pt: 0.8 },
    });
  });
}

function renderStudioIntroSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  fillImage(slide, IMAGES.introFur);
  slide.addText(upperIfAscii(safeTitle(item.title)), {
    x: 0.76,
    y: 0.72,
    w: 4.4,
    h: 2.5,
    fontFace: "Arial",
    fontSize: 38,
    bold: true,
    color: COLORS.orange,
    breakLine: true,
    margin: 0,
    fit: "shrink",
  });
  addBodyText(slide, asParagraph(item, "핵심 소개 문장을 입력해 주세요."), {
    x: 10.4,
    y: 0.8,
    w: 1.86,
    h: 2.85,
    fontSize: 10,
    bold: true,
    color: COLORS.orange,
    align: "center",
    valign: "mid",
  });
  slide.addText("OVERVIEW OF THE BRIEF", {
    x: 10.52,
    y: 6.04,
    w: 1.74,
    h: 0.42,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.orange,
    align: "right",
    margin: 0,
  });
  addSectionNumber(slide, sectionNumber);
}

function renderSplitCampaignSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  fillImage(slide, IMAGES.splitModel, 0, 0, 6.65, SLIDE_H);
  fillImage(slide, IMAGES.splitTexture, 6.65, 0, 6.68, SLIDE_H);
  addBodyText(slide, asParagraph(item, "프로젝트 핵심 문장을 입력해 주세요."), {
    x: 10.1,
    y: 0.95,
    w: 2.02,
    h: 1.9,
    fontSize: 11,
    bold: true,
    color: COLORS.white,
    align: "center",
    valign: "mid",
  });
  addSectionNumber(slide, sectionNumber);
}

function renderTargetAudienceSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  setPaperBackground(slide);
  slide.addText(upperIfAscii(safeTitle(item.title)), {
    x: 0.86,
    y: 0.86,
    w: 3.9,
    h: 1.5,
    fontFace: "Arial",
    fontSize: 34,
    bold: true,
    color: COLORS.orange,
    breakLine: true,
    margin: 0,
    fit: "shrink",
  });
  fillImage(slide, IMAGES.vase, 10.08, 0.3, 3.08, 6.9);
  const rows = ensureItems(item.bullets, 3, "핵심 항목");
  const labels = ["AGE:", "CLIENTS:", "LOCATION:"];
  rows.forEach((row, index) => {
    const y = 3.05 + index * 0.9;
    slide.addText(labels[index], {
      x: 0.9,
      y: y - 0.12,
      w: 1.0,
      h: 0.18,
      fontFace: "Arial",
      fontSize: 10,
      bold: true,
      color: COLORS.orange,
      margin: 0,
    });
    slide.addText(row, {
      x: 5.6,
      y: y - 0.18,
      w: 3.1,
      h: 0.36,
      fontFace: "Arial",
      fontSize: 12,
      bold: true,
      color: COLORS.orange,
      margin: 0,
      fit: "shrink",
      align: "center",
    });
    slide.addShape("line", {
      x: 0.98,
      y,
      w: 9.3,
      h: 0,
      line: { color: COLORS.orange, pt: 0.8 },
    });
  });
  slide.addText("WHO IS THIS INTENDED FOR?", {
    x: 7.6,
    y: 5.96,
    w: 1.74,
    h: 0.4,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.orange,
    margin: 0,
    align: "center",
  });
  addSectionNumber(slide, sectionNumber);
}

function renderSocialMediaSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  fillImage(slide, IMAGES.hide, 0, 0, 6.66, SLIDE_H);
  fillImage(slide, IMAGES.shirt, 6.66, 0, 6.67, SLIDE_H);
  fillImage(slide, IMAGES.path, 8.3, 1.92, 3.35, 4.06);
  slide.addText(upperIfAscii(safeTitle(item.title)), {
    x: 0.8,
    y: 0.88,
    w: 3.24,
    h: 1.36,
    fontFace: "Arial",
    fontSize: 34,
    bold: true,
    color: COLORS.orange,
    breakLine: true,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(asParagraph(item, "ENGAGING CONTENT ACROSS PLATFORMS TO DRIVE SALES"), {
    x: 10.04,
    y: 5.8,
    w: 2.06,
    h: 0.62,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.white,
    align: "center",
    margin: 0,
    fit: "shrink",
  });
  addSectionNumber(slide, sectionNumber);
}

function renderDeliverablesSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  setPaperBackground(slide);
  slide.addText(upperIfAscii(safeTitle(item.title)), {
    x: 0.86,
    y: 0.9,
    w: 6.2,
    h: 0.7,
    fontFace: "Arial",
    fontSize: 36,
    bold: true,
    color: COLORS.orange,
    margin: 0,
    fit: "shrink",
  });
  fillImage(slide, IMAGES.cactus, 9.4, 0.32, 3.93, 6.96);
  const rows = ensureItems(item.bullets, 2, "전달물");
  const labels = ["CONTENT:", "FORMATS:"];
  rows.forEach((row, index) => {
    const y = 3.54 + index * 0.78;
    slide.addText(labels[index], {
      x: 0.88,
      y: y - 0.12,
      w: 1.25,
      h: 0.18,
      fontFace: "Arial",
      fontSize: 10,
      bold: true,
      color: COLORS.orange,
      margin: 0,
    });
    slide.addText(row, {
      x: 5.3,
      y: y - 0.2,
      w: 3.6,
      h: 0.42,
      fontFace: "Arial",
      fontSize: 11,
      bold: true,
      color: COLORS.orange,
      align: "center",
      margin: 0,
      fit: "shrink",
    });
    slide.addShape("line", {
      x: 0.98,
      y,
      w: 8.58,
      h: 0,
      line: { color: COLORS.orange, pt: 0.8 },
    });
  });
  slide.addText("CREATORS HAVE TASKS TO TACKLE", {
    x: 7.56,
    y: 6.06,
    w: 1.72,
    h: 0.34,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.orange,
    align: "center",
    margin: 0,
  });
  addSectionNumber(slide, sectionNumber);
}

function renderTextureSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  fillImage(slide, IMAGES.leather);
  slide.addText(upperIfAscii(safeTitle(item.title)), {
    x: 0.86,
    y: 0.82,
    w: 3.4,
    h: 1.34,
    fontFace: "Arial",
    fontSize: 34,
    bold: true,
    color: COLORS.orange,
    breakLine: true,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(asParagraph(item, "A GLIMPSE INTO THE VISUAL IDENTITY AND AESTHETIC DIRECTION"), {
    x: 10.16,
    y: 5.9,
    w: 2.0,
    h: 0.58,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.orange,
    align: "center",
    margin: 0,
    fit: "shrink",
  });
  addSectionNumber(slide, sectionNumber);
}

function renderInsetEditorialSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  setPaperBackground(slide);
  fillImage(slide, IMAGES.heels, 6.98, 0, 6.35, SLIDE_H);
  fillImage(slide, IMAGES.glass, 8.36, 1.64, 3.36, 4.42);
  addBodyText(slide, asParagraph(item, "디자인 방향과 실행 포인트를 요약해 주세요."), {
    x: 0.88,
    y: 0.88,
    w: 2.24,
    h: 3.42,
    fontSize: 12,
    bold: true,
    color: COLORS.orange,
  });
  addSectionNumber(slide, sectionNumber);
}

function renderContactSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  setPaperBackground(slide);
  slide.addText(upperIfAscii(safeTitle(item.title)), {
    x: 0.86,
    y: 0.86,
    w: 4.9,
    h: 0.7,
    fontFace: "Arial",
    fontSize: 36,
    bold: true,
    color: COLORS.orange,
    margin: 0,
    fit: "shrink",
  });
  const labels = ["PHONE:", "E-MAIL:", "WEBSITE:", "SOCIAL MEDIA:"];
  const values = ensureItems(item.bullets, 4, "연락 정보");
  labels.forEach((label, index) => {
    const y = 2.92 + index * 0.9;
    slide.addText(label, {
      x: 0.88,
      y: y - 0.16,
      w: 1.4,
      h: 0.2,
      fontFace: "Arial",
      fontSize: 10,
      bold: true,
      color: COLORS.orange,
      margin: 0,
    });
    slide.addText(values[index], {
      x: 9.62,
      y: y - 0.2,
      w: 2.58,
      h: 0.28,
      fontFace: "Arial",
      fontSize: 12,
      bold: true,
      color: COLORS.orange,
      margin: 0,
      align: "right",
      fit: "shrink",
    });
    slide.addShape("line", {
      x: 0,
      y,
      w: SLIDE_W,
      h: 0,
      line: { color: COLORS.orange, pt: 0.8 },
    });
  });
  slide.addText("THE WAY TO REACH US", {
    x: 10.36,
    y: 6.08,
    w: 1.82,
    h: 0.4,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    color: COLORS.orange,
    margin: 0,
    align: "center",
  });
  addSectionNumber(slide, sectionNumber);
}

function renderDetailSlide(slide: PptxSlide, item: SlideSpec, detailIndex: number, sectionNumber: number) {
  const layouts = [
    renderStudioIntroSlide,
    renderTargetAudienceSlide,
    renderSocialMediaSlide,
    renderDeliverablesSlide,
    renderTextureSlide,
    renderInsetEditorialSlide,
  ];
  if (item.kind === "summary") {
    renderContactSlide(slide, item, sectionNumber);
    return;
  }
  const renderer = layouts[detailIndex % layouts.length];
  renderer(slide, item, sectionNumber);
}

export function renderModernA(pptx: PptxInstance, spec: PresentationSpec) {
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Codex";
  pptx.company = "juwonparkme";
  pptx.subject = spec.title;
  pptx.title = spec.title;
  pptx.lang = spec.language;
  pptx.theme = {
    headFontFace: "Arial",
    bodyFontFace: "Arial",
    lang: spec.language,
  };
  pptx.defineLayout({ name: "CODEX_WIDE", width: SLIDE_W, height: SLIDE_H });

  let detailIndex = 0;
  let sectionNumber = 1;

  spec.slides.forEach((item) => {
    const slide = pptx.addSlide();
    if (item.kind === "title") {
      renderTitleSlide(slide, spec, item);
      return;
    }
    if (item.kind === "toc") {
      renderTocSlide(slide, spec, item);
      return;
    }
    renderDetailSlide(slide, item, detailIndex, sectionNumber);
    detailIndex += 1;
    sectionNumber += 1;
  });
}
