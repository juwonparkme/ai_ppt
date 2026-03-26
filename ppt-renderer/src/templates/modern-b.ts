import type { PresentationSpec, SlideSpec } from "../spec.js";
import { SLIDE_H, SLIDE_W, templateAssetPath } from "./assets.js";

type PptxInstance = any;
type PptxSlide = any;

const COLORS = {
  bg: "B7CDE2",
  panel: "FFFFFF",
  ink: "262126",
  accent: "7F9AB2",
  accentSoft: "EEF2F6",
  accentLine: "9EB6CB",
  muted: "6F7077",
};

const BUILDING_IMAGE = templateAssetPath("modern-b", "page-03-img-01.jpg");

function addBaseFrame(slide: PptxSlide) {
  slide.background = { color: COLORS.bg };
  slide.addShape("rect", {
    x: 0.24,
    y: 0.3,
    w: 12.85,
    h: 6.9,
    radius: 0.22,
    fill: { color: COLORS.panel },
    line: { color: COLORS.panel, transparency: 100 },
  });
  slide.addShape("rect", {
    x: 4.15,
    y: 0,
    w: 5.05,
    h: 0.78,
    radius: 0.2,
    fill: { color: COLORS.bg },
    line: { color: COLORS.bg, transparency: 100 },
  });
  slide.addText("BUSINESS PRESENTATION", {
    x: 4.3,
    y: 0.2,
    w: 4.75,
    h: 0.24,
    align: "center",
    fontFace: "Aptos",
    fontSize: 12,
    color: COLORS.muted,
    margin: 0,
  });
}

function addSectionHeader(slide: PptxSlide, sectionNumber: number, title: string) {
  slide.addText(String(sectionNumber).padStart(2, "0"), {
    x: 1.15,
    y: 1.22,
    w: 1.0,
    h: 0.44,
    fontFace: "Aptos",
    fontSize: 26,
    bold: true,
    color: COLORS.accent,
    margin: 0,
    align: "center",
  });
  slide.addText(title, {
    x: 3.15,
    y: 1.08,
    w: 7.2,
    h: 0.5,
    fontFace: "Aptos Display",
    fontSize: 28,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    align: "center",
    fit: "shrink",
  });
  slide.addShape("line", {
    x: 0.98,
    y: 1.87,
    w: 11.35,
    h: 0,
    line: { color: COLORS.accentLine, pt: 1.1 },
  });
}

function addRoundedCard(slide: PptxSlide, opts: Record<string, any>) {
  slide.addShape("rect", {
    ...opts,
    radius: 0.16,
  });
}

function fitTitleLines(text: string): [string, string] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return [text, ""];
  }
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

function splitBullets(items: string[]): [string[], string[]] {
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
}

function firstSentence(item: SlideSpec): string {
  if (item.subtitle?.trim()) {
    return item.subtitle.trim();
  }
  return item.bullets[0] || "";
}

function takeBullets(items: string[], count: number, fallbackPrefix: string): string[] {
  const picked = items.filter(Boolean).slice(0, count);
  while (picked.length < count) {
    picked.push(`${fallbackPrefix} ${picked.length + 1}`);
  }
  return picked;
}

function addBulletLines(
  slide: PptxSlide,
  items: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  fontSize: number,
) {
  slide.addText(
    items.map((item) => ({
      text: item,
      options: { bullet: { indent: 14 } },
    })),
    {
      x,
      y,
      w,
      h,
      fontFace: "Aptos",
      fontSize,
      color: COLORS.ink,
      breakLine: true,
      paraSpaceAfterPt: 10,
      margin: 0,
      fit: "shrink",
      valign: "top",
    },
  );
}

function renderTitleSlide(slide: PptxSlide, spec: PresentationSpec, item: SlideSpec) {
  addBaseFrame(slide);
  const [lineOne, lineTwo] = fitTitleLines(item.title || spec.title);
  slide.addText(lineOne, {
    x: 1.55,
    y: 2.1,
    w: 10.2,
    h: 0.95,
    fontFace: "Aptos Display",
    fontSize: 36,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    align: "center",
    fit: "shrink",
  });
  slide.addText(lineTwo || item.subtitle || spec.metadata.topic || "", {
    x: 1.45,
    y: 3.22,
    w: 10.4,
    h: 1.05,
    fontFace: "Aptos Display",
    fontSize: 40,
    bold: true,
    color: COLORS.accent,
    margin: 0,
    align: "center",
    fit: "shrink",
  });
  slide.addShape("line", {
    x: 0.98,
    y: 6.32,
    w: 11.35,
    h: 0,
    line: { color: COLORS.accentLine, pt: 1.1 },
  });
  slide.addText("기획팀 | AI PPT | 123-456-7890 | hello@reallygreatsite.com", {
    x: 1.2,
    y: 6.58,
    w: 10.8,
    h: 0.35,
    fontFace: "Aptos",
    fontSize: 12,
    color: COLORS.muted,
    margin: 0,
    align: "center",
    fit: "shrink",
  });
}

function renderTocSlide(slide: PptxSlide, spec: PresentationSpec) {
  addBaseFrame(slide);
  slide.addText("CONTENTS", {
    x: 4.3,
    y: 1.32,
    w: 4.75,
    h: 0.56,
    fontFace: "Aptos Display",
    fontSize: 34,
    bold: false,
    color: COLORS.ink,
    align: "center",
    margin: 0,
  });

  const detailSlides = spec.slides.filter((item) => item.kind !== "title" && item.kind !== "toc");
  const tocItems = takeBullets(
    detailSlides.map((item) => item.title),
    6,
    "섹션",
  );
  const tocDescriptions = takeBullets(
    detailSlides.map(firstSentence).filter(Boolean),
    6,
    "해당 목차에 대한 설명을 입력해 주세요",
  );

  const positions = [
    { numX: 1.3, textX: 2.85, y: 2.72 },
    { numX: 1.45, textX: 2.85, y: 4.08 },
    { numX: 1.45, textX: 2.85, y: 5.44 },
    { numX: 7.15, textX: 8.7, y: 2.72 },
    { numX: 7.15, textX: 8.7, y: 4.08 },
    { numX: 7.15, textX: 8.7, y: 5.44 },
  ];

  positions.forEach((position, index) => {
    slide.addText(String(index + 1).padStart(2, "0"), {
      x: position.numX,
      y: position.y,
      w: 0.88,
      h: 0.4,
      fontFace: "Aptos",
      fontSize: 26,
      bold: true,
      color: COLORS.accent,
      margin: 0,
      align: "center",
    });
    slide.addText(tocItems[index], {
      x: position.textX,
      y: position.y - 0.04,
      w: 3.25,
      h: 0.34,
      fontFace: "Aptos",
      fontSize: 16,
      bold: true,
      color: COLORS.ink,
      margin: 0,
      fit: "shrink",
    });
    slide.addText(tocDescriptions[index], {
      x: position.textX,
      y: position.y + 0.38,
      w: 3.35,
      h: 0.24,
      fontFace: "Aptos",
      fontSize: 10,
      color: COLORS.muted,
      margin: 0,
      fit: "shrink",
    });
    slide.addShape("line", {
      x: index < 3 ? 1.22 : 7.0,
      y: position.y + 0.86,
      w: 5.05,
      h: 0,
      line: { color: COLORS.accentLine, pt: 0.95 },
    });
  });
}

function renderOverviewSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  addBaseFrame(slide);
  addSectionHeader(slide, sectionNumber, item.title);

  slide.addImage({
    path: BUILDING_IMAGE,
    x: 0.98,
    y: 2.28,
    w: 4.72,
    h: 4.38,
  });

  const bullets = takeBullets(item.bullets, 3, "핵심 포인트");
  const labels = ["프로젝트 배경", "프로젝트 목적", "프로젝트 기간"];

  labels.forEach((label, index) => {
    slide.addText(`${label} |`, {
      x: 6.42,
      y: 2.62 + index * 0.78,
      w: 1.75,
      h: 0.28,
      fontFace: "Aptos",
      fontSize: 16,
      bold: true,
      color: COLORS.accent,
      margin: 0,
      align: "right",
    });
    slide.addText(bullets[index], {
      x: 8.26,
      y: 2.6 + index * 0.78,
      w: 3.55,
      h: 0.34,
      fontFace: "Aptos",
      fontSize: 14,
      color: COLORS.ink,
      margin: 0,
      fit: "shrink",
    });
  });

  addRoundedCard(slide, {
    x: 6.2,
    y: 5.0,
    w: 5.9,
    h: 1.72,
    fill: { color: COLORS.accentSoft },
    line: { color: COLORS.accentSoft, transparency: 100 },
  });
  slide.addText("핵심 내용", {
    x: 8.0,
    y: 5.28,
    w: 2.25,
    h: 0.3,
    fontFace: "Aptos",
    fontSize: 16,
    bold: true,
    color: COLORS.accent,
    margin: 0,
    align: "center",
  });
  slide.addText(item.subtitle || item.bullets.join(" / "), {
    x: 6.72,
    y: 5.65,
    w: 4.9,
    h: 0.78,
    fontFace: "Aptos",
    fontSize: 13,
    color: COLORS.muted,
    margin: 0,
    fit: "shrink",
    valign: "mid",
    align: "center",
  });
}

function renderCardColumnsSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  addBaseFrame(slide);
  addSectionHeader(slide, sectionNumber, item.title);
  const cards = takeBullets(item.bullets, 3, "핵심 키워드");
  cards.forEach((card, index) => {
    const x = 0.98 + index * 3.95;
    addRoundedCard(slide, {
      x,
      y: 2.28,
      w: 3.36,
      h: 4.52,
      fill: { color: COLORS.accentSoft },
      line: { color: COLORS.accentSoft, transparency: 100 },
    });
    slide.addText(`POINT 0${index + 1}.`, {
      x: x + 0.55,
      y: 2.72,
      w: 2.25,
      h: 0.28,
      fontFace: "Aptos",
      fontSize: 16,
      bold: true,
      color: COLORS.accent,
      margin: 0,
      align: "center",
    });
    addRoundedCard(slide, {
      x: x + 0.32,
      y: 3.18,
      w: 2.72,
      h: 0.62,
      fill: { color: COLORS.panel },
      line: { color: COLORS.panel, transparency: 100 },
    });
    slide.addText(card, {
      x: x + 0.46,
      y: 3.35,
      w: 2.45,
      h: 0.24,
      fontFace: "Aptos",
      fontSize: 12,
      bold: true,
      color: COLORS.ink,
      align: "center",
      margin: 0,
      fit: "shrink",
    });
    addBulletLines(
      slide,
      takeBullets(item.bullets.slice(index), 4, `${card} 항목`),
      x + 0.56,
      4.12,
      2.16,
      2.15,
      10,
    );
  });
}

function renderTableSummarySlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  addBaseFrame(slide);
  addSectionHeader(slide, sectionNumber, item.title);

  const rows = takeBullets(item.bullets, 4, "분석 항목");
  addRoundedCard(slide, {
    x: 0.98,
    y: 2.3,
    w: 2.1,
    h: 0.58,
    fill: { color: COLORS.accentSoft },
    line: { color: COLORS.accentSoft, transparency: 100 },
  });
  addRoundedCard(slide, {
    x: 3.25,
    y: 2.3,
    w: 3.15,
    h: 0.58,
    fill: { color: COLORS.accentSoft },
    line: { color: COLORS.accentSoft, transparency: 100 },
  });
  addRoundedCard(slide, {
    x: 6.85,
    y: 2.3,
    w: 5.25,
    h: 4.45,
    fill: { color: COLORS.accentSoft },
    line: { color: COLORS.accentSoft, transparency: 100 },
  });
  slide.addText("항목", {
    x: 1.57,
    y: 2.46,
    w: 0.92,
    h: 0.2,
    fontFace: "Aptos",
    fontSize: 15,
    bold: true,
    color: COLORS.accent,
    margin: 0,
    align: "center",
  });
  slide.addText("상세 내용", {
    x: 4.1,
    y: 2.46,
    w: 1.42,
    h: 0.2,
    fontFace: "Aptos",
    fontSize: 15,
    bold: true,
    color: COLORS.accent,
    margin: 0,
    align: "center",
  });
  slide.addText("분기 요약", {
    x: 8.65,
    y: 2.48,
    w: 1.7,
    h: 0.2,
    fontFace: "Aptos",
    fontSize: 15,
    bold: true,
    color: COLORS.accent,
    margin: 0,
    align: "center",
  });

  rows.forEach((row, index) => {
    const rowY = 3.28 + index * 0.94;
    slide.addText(`항목 ${index + 1}`, {
      x: 1.45,
      y: rowY,
      w: 1.1,
      h: 0.26,
      fontFace: "Aptos",
      fontSize: 13,
      bold: true,
      color: COLORS.ink,
      margin: 0,
      align: "center",
    });
    slide.addText(row, {
      x: 3.5,
      y: rowY,
      w: 2.68,
      h: 0.4,
      fontFace: "Aptos",
      fontSize: 12,
      color: COLORS.muted,
      margin: 0,
      fit: "shrink",
    });
    if (index < rows.length - 1) {
      slide.addShape("line", {
        x: 1.0,
        y: rowY + 0.66,
        w: 5.42,
        h: 0,
        line: { color: COLORS.accentLine, pt: 0.7, dash: "sysDot" },
      });
    }
  });

  rows.slice(0, 5).forEach((row, index) => {
    const rowY = 3.36 + index * 0.66;
    slide.addText(`${index + 1}.`, {
      x: 7.2,
      y: rowY,
      w: 0.35,
      h: 0.22,
      fontFace: "Aptos",
      fontSize: 13,
      bold: true,
      color: COLORS.accent,
      margin: 0,
      align: "right",
    });
    slide.addText(row, {
      x: 7.72,
      y: rowY,
      w: 3.65,
      h: 0.3,
      fontFace: "Aptos",
      fontSize: 12,
      color: COLORS.ink,
      margin: 0,
      fit: "shrink",
    });
    slide.addShape("line", {
      x: 7.1,
      y: rowY + 0.38,
      w: 4.45,
      h: 0,
      line: { color: COLORS.accentLine, pt: 0.7 },
    });
  });
}

function renderDataGridSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  addBaseFrame(slide);
  addSectionHeader(slide, sectionNumber, item.title);
  const values = takeBullets(item.bullets, 5, "데이터");
  const columns = ["연도", "매입액", "매출액", "매출이익", "손익"];
  columns.forEach((column, index) => {
    addRoundedCard(slide, {
      x: 1.0 + index * 2.34,
      y: 2.28,
      w: 2.08,
      h: 0.58,
      fill: { color: COLORS.accentSoft },
      line: { color: COLORS.accentSoft, transparency: 100 },
    });
    slide.addText(column, {
      x: 1.2 + index * 2.34,
      y: 2.47,
      w: 1.68,
      h: 0.2,
      fontFace: "Aptos",
      fontSize: 15,
      bold: true,
      color: COLORS.accent,
      margin: 0,
      align: "center",
    });
  });
  [0, 1, 2].forEach((rowIndex) => {
    const y = 3.36 + rowIndex * 0.66;
    slide.addText(`20${78 + rowIndex}년`, {
      x: 1.35,
      y,
      w: 1.35,
      h: 0.2,
      fontFace: "Aptos",
      fontSize: 12,
      color: COLORS.ink,
      margin: 0,
      align: "center",
    });
    values.slice(0, 4).forEach((_, index) => {
      slide.addText(`${(rowIndex + 2) * (index + 2)},${(index + rowIndex) * 12}`, {
        x: 3.55 + index * 2.34,
        y,
        w: 1.02,
        h: 0.2,
        fontFace: "Aptos",
        fontSize: 12,
        color: COLORS.muted,
        margin: 0,
        align: "center",
      });
    });
    slide.addShape("line", {
      x: 0.98,
      y: y + 0.35,
      w: 11.1,
      h: 0,
      line: { color: COLORS.accentLine, pt: 0.7, dash: "sysDot" },
    });
  });
  addRoundedCard(slide, {
    x: 0.98,
    y: 5.58,
    w: 11.1,
    h: 1.1,
    fill: { color: COLORS.accentSoft },
    line: { color: COLORS.accentSoft, transparency: 100 },
  });
  slide.addText("연도별 추이 변화", {
    x: 1.72,
    y: 5.95,
    w: 1.8,
    h: 0.25,
    fontFace: "Aptos",
    fontSize: 15,
    bold: true,
    color: COLORS.accent,
    margin: 0,
  });
  slide.addText(values.join(" / "), {
    x: 4.2,
    y: 5.88,
    w: 6.8,
    h: 0.42,
    fontFace: "Aptos",
    fontSize: 12,
    color: COLORS.ink,
    margin: 0,
    fit: "shrink",
  });
}

function renderCompareSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  addBaseFrame(slide);
  addSectionHeader(slide, sectionNumber, item.title);
  const [leftItems, rightItems] = splitBullets(takeBullets(item.bullets, 8, "비교 포인트"));
  addRoundedCard(slide, {
    x: 0.98,
    y: 2.28,
    w: 5.65,
    h: 4.45,
    fill: { color: COLORS.accentSoft },
    line: { color: COLORS.accentSoft, transparency: 100 },
  });
  addRoundedCard(slide, {
    x: 6.7,
    y: 2.28,
    w: 5.4,
    h: 4.45,
    fill: { color: COLORS.accentSoft },
    line: { color: COLORS.accentSoft, transparency: 100 },
  });
  slide.addText("타사 서비스", {
    x: 2.45,
    y: 2.72,
    w: 1.8,
    h: 0.22,
    fontFace: "Aptos",
    fontSize: 16,
    color: COLORS.muted,
    margin: 0,
  });
  slide.addText("자사 서비스", {
    x: 8.62,
    y: 2.72,
    w: 1.8,
    h: 0.22,
    fontFace: "Aptos",
    fontSize: 16,
    bold: true,
    color: COLORS.accent,
    margin: 0,
  });
  addRoundedCard(slide, {
    x: 5.97,
    y: 4.03,
    w: 0.78,
    h: 0.78,
    fill: { color: COLORS.bg },
    line: { color: COLORS.panel, pt: 2 },
  });
  slide.addText("VS", {
    x: 6.08,
    y: 4.27,
    w: 0.55,
    h: 0.2,
    fontFace: "Aptos Display",
    fontSize: 18,
    bold: true,
    color: COLORS.muted,
    margin: 0,
    align: "center",
  });

  leftItems.slice(0, 4).forEach((text, index) => {
    addRoundedCard(slide, {
      x: 1.46,
      y: 3.2 + index * 0.8,
      w: 4.5,
      h: 0.45,
      fill: { color: COLORS.panel },
      line: { color: COLORS.panel, transparency: 100 },
    });
    slide.addText(text, {
      x: 1.75,
      y: 3.34 + index * 0.8,
      w: 3.95,
      h: 0.18,
      fontFace: "Aptos",
      fontSize: 11,
      color: COLORS.ink,
      align: "center",
      margin: 0,
      fit: "shrink",
    });
  });
  rightItems.slice(0, 4).forEach((text, index) => {
    addRoundedCard(slide, {
      x: 7.18,
      y: 3.2 + index * 0.8,
      w: 4.18,
      h: 0.45,
      fill: { color: COLORS.panel },
      line: { color: COLORS.panel, transparency: 100 },
    });
    slide.addText(text, {
      x: 7.45,
      y: 3.34 + index * 0.8,
      w: 3.62,
      h: 0.18,
      fontFace: "Aptos",
      fontSize: 11,
      color: COLORS.ink,
      align: "center",
      margin: 0,
      fit: "shrink",
    });
  });
}

function renderSummarySlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  addBaseFrame(slide);
  addSectionHeader(slide, sectionNumber, item.title);
  const bullets = takeBullets(item.bullets, 2, "핵심 성과");
  bullets.forEach((bullet, index) => {
    const y = 2.72 + index * 1.42;
    slide.addText(`핵심 키워드 0${index + 1}`, {
      x: 1.78,
      y,
      w: 1.7,
      h: 0.22,
      fontFace: "Aptos",
      fontSize: 15,
      bold: true,
      color: COLORS.accent,
      margin: 0,
    });
    slide.addText(bullet, {
      x: 4.1,
      y,
      w: 7.15,
      h: 0.34,
      fontFace: "Aptos",
      fontSize: 13,
      color: COLORS.ink,
      margin: 0,
      fit: "shrink",
    });
    slide.addShape("line", {
      x: 0.98,
      y: y + 0.74,
      w: 11.1,
      h: 0,
      line: { color: COLORS.accentLine, pt: 0.7, dash: "sysDot" },
    });
  });
  slide.addText("▼", {
    x: 6.52,
    y: 4.88,
    w: 0.3,
    h: 0.18,
    fontFace: "Aptos",
    fontSize: 18,
    color: COLORS.accent,
    margin: 0,
    align: "center",
  });
  addRoundedCard(slide, {
    x: 0.98,
    y: 5.38,
    w: 11.1,
    h: 1.44,
    fill: { color: COLORS.accentSoft },
    line: { color: COLORS.accentSoft, transparency: 100 },
  });
  slide.addText("결론 요약", {
    x: 2.12,
    y: 5.88,
    w: 1.35,
    h: 0.22,
    fontFace: "Aptos",
    fontSize: 15,
    bold: true,
    color: COLORS.accent,
    margin: 0,
  });
  slide.addText(item.bullets.join(" "), {
    x: 4.12,
    y: 5.78,
    w: 7.2,
    h: 0.5,
    fontFace: "Aptos",
    fontSize: 13,
    color: COLORS.ink,
    margin: 0,
    fit: "shrink",
  });
}

function renderGoalsSlide(slide: PptxSlide, item: SlideSpec, sectionNumber: number) {
  addBaseFrame(slide);
  addSectionHeader(slide, sectionNumber, item.title);
  addRoundedCard(slide, {
    x: 0.98,
    y: 2.28,
    w: 11.1,
    h: 1.1,
    fill: { color: COLORS.accentSoft },
    line: { color: COLORS.accentSoft, transparency: 100 },
  });
  slide.addText("목표", {
    x: 2.15,
    y: 2.7,
    w: 0.82,
    h: 0.24,
    fontFace: "Aptos",
    fontSize: 16,
    bold: true,
    color: COLORS.accent,
    margin: 0,
  });
  addBulletLines(slide, takeBullets(item.bullets, 2, "향후 목표"), 3.55, 2.58, 7.2, 0.66, 12);
  slide.addText("▲", {
    x: 6.5,
    y: 3.52,
    w: 0.36,
    h: 0.2,
    fontFace: "Aptos",
    fontSize: 16,
    color: COLORS.accent,
    align: "center",
    margin: 0,
  });

  const items = takeBullets(item.bullets, 4, "키워드");
  items.forEach((text, index) => {
    const x = 1.1 + index * 2.95;
    slide.addShape("ellipse", {
      x: x + 0.52,
      y: 4.52,
      w: 0.72,
      h: 0.72,
      fill: { color: COLORS.panel },
      line: { color: COLORS.accentLine, pt: 1.4 },
    });
    slide.addText(String(index + 1), {
      x: x + 0.72,
      y: 4.77,
      w: 0.32,
      h: 0.16,
      fontFace: "Aptos",
      fontSize: 12,
      bold: true,
      color: COLORS.accent,
      align: "center",
      margin: 0,
    });
    slide.addText(`키워드 0${index + 1}`, {
      x,
      y: 5.88,
      w: 1.8,
      h: 0.22,
      fontFace: "Aptos",
      fontSize: 15,
      bold: true,
      color: COLORS.accent,
      align: "center",
      margin: 0,
    });
    slide.addText(text, {
      x: x - 0.12,
      y: 6.24,
      w: 2.08,
      h: 0.34,
      fontFace: "Aptos",
      fontSize: 10,
      color: COLORS.muted,
      align: "center",
      margin: 0,
      fit: "shrink",
    });
    if (index < 3) {
      slide.addShape("line", {
        x: x + 1.98,
        y: 4.42,
        w: 0,
        h: 2.28,
        line: { color: COLORS.accentLine, pt: 0.7, dash: "sysDot" },
      });
    }
  });
}

function renderDetailSlide(
  slide: PptxSlide,
  item: SlideSpec,
  detailIndex: number,
  sectionNumber: number,
) {
  const layoutKey = item.kind === "summary" ? 99 : detailIndex % 5;
  switch (layoutKey) {
    case 0:
      renderOverviewSlide(slide, item, sectionNumber);
      return;
    case 1:
      renderCardColumnsSlide(slide, item, sectionNumber);
      return;
    case 2:
      renderTableSummarySlide(slide, item, sectionNumber);
      return;
    case 3:
      renderDataGridSlide(slide, item, sectionNumber);
      return;
    case 4:
      renderCompareSlide(slide, item, sectionNumber);
      return;
    default:
      renderSummarySlide(slide, item, sectionNumber);
      return;
  }
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
  pptx.defineLayout({ name: "CODEx_WIDE", width: SLIDE_W, height: SLIDE_H });

  let detailIndex = 0;
  let sectionNumber = 1;

  spec.slides.forEach((item) => {
    const slide = pptx.addSlide();
    if (item.kind === "title") {
      renderTitleSlide(slide, spec, item);
      return;
    }
    if (item.kind === "toc") {
      renderTocSlide(slide, spec);
      return;
    }
    if (item.kind === "summary" && detailIndex >= 4) {
      renderGoalsSlide(slide, item, sectionNumber);
      detailIndex += 1;
      sectionNumber += 1;
      return;
    }
    renderDetailSlide(slide, item, detailIndex, sectionNumber);
    detailIndex += 1;
    sectionNumber += 1;
  });
}
