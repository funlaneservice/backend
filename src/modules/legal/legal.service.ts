import { LegalDocument, LegalDocumentType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { recordAuditEvent, RequestContext } from "../audit/audit.service";
import { LegalDocumentSlug } from "./legal.schema";

const SLUG_TO_TYPE: Record<LegalDocumentSlug, LegalDocumentType> = {
  terms: "TERMS_AND_CONDITIONS",
  privacy: "PRIVACY_POLICY",
};

function toLegalDocumentView(slug: LegalDocumentSlug, document: LegalDocument | null) {
  return {
    type: slug,
    content: document?.content ?? "",
    updatedAt: document?.updatedAt ?? null,
  };
}

export async function getLegalDocument(slug: LegalDocumentSlug) {
  const document = await prisma.legalDocument.findUnique({ where: { type: SLUG_TO_TYPE[slug] } });
  return toLegalDocumentView(slug, document);
}

export async function updateLegalDocument(
  slug: LegalDocumentSlug,
  content: string,
  adminId: string,
  ctx: RequestContext
) {
  const type = SLUG_TO_TYPE[slug];
  const document = await prisma.legalDocument.upsert({
    where: { type },
    create: { type, content, updatedBy: adminId },
    update: { content, updatedBy: adminId },
  });

  await recordAuditEvent({
    action: "LEGAL_DOCUMENT_UPDATED",
    status: "SUCCESS",
    actorId: adminId,
    targetType: "LegalDocument",
    targetId: document.id,
    metadata: { type: slug },
    ...ctx,
  });

  return toLegalDocumentView(slug, document);
}
