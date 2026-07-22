import { z } from "zod";

export const LEGAL_DOCUMENT_SLUGS = ["terms", "privacy"] as const;

export const legalTypeParamSchema = z.object({
  type: z.enum(LEGAL_DOCUMENT_SLUGS),
});

export const updateLegalDocumentSchema = z.object({
  content: z.string().min(1),
});

export type LegalDocumentSlug = (typeof LEGAL_DOCUMENT_SLUGS)[number];
export type LegalTypeParam = z.infer<typeof legalTypeParamSchema>;
export type UpdateLegalDocumentInput = z.infer<typeof updateLegalDocumentSchema>;
