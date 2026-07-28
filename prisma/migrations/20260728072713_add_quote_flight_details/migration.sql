/*
  Warnings:

  - Added the required column `arrivalTime` to the `quote_options` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cabinClass` to the `quote_options` table without a default value. This is not possible if the table is not empty.
  - Added the required column `flightNumber` to the `quote_options` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "quote_options" ADD COLUMN     "arrivalTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "baggageAllowance" TEXT,
ADD COLUMN     "bookingReference" TEXT,
ADD COLUMN     "cabinClass" "BudgetTier" NOT NULL,
ADD COLUMN     "flightNumber" TEXT NOT NULL,
ADD COLUMN     "stops" INTEGER NOT NULL DEFAULT 0;
