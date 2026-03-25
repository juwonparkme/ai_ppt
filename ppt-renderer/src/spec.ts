import { z } from "zod";

export const slideKindSchema = z.enum(["title", "toc", "bullets", "summary"]);

export const slideSchema = z.object({
  id: z.string(),
  kind: slideKindSchema,
  title: z.string(),
  subtitle: z.string().optional().default(""),
  bullets: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(""),
});

export const presentationSpecSchema = z.object({
  version: z.literal("1.0"),
  title: z.string(),
  template: z.string(),
  language: z.string().default("ko"),
  metadata: z.record(z.any()).default({}),
  slides: z.array(slideSchema).min(1),
});

export type SlideSpec = z.infer<typeof slideSchema>;
export type PresentationSpec = z.infer<typeof presentationSpecSchema>;
