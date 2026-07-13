-- AlterTable
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL,
ADD COLUMN     "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
