-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS_AND_CONDITIONS', 'PRIVACY_POLICY');

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_type_key" ON "legal_documents"("type");
