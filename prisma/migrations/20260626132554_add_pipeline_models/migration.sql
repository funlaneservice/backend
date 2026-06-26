-- CreateEnum
CREATE TYPE "BudgetTier" AS ENUM ('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'OPTIONS_SENT', 'APPROVED_LOCKED', 'ISSUED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('TOPUP', 'LOCK', 'CAPTURE', 'RELEASE', 'PAYOUT_DEBIT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaystackEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lockedBalance" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "lockedAfter" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_requests" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assignedAgentId" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "budgetTier" "BudgetTier" NOT NULL,
    "preferredAirline" TEXT,
    "preferredTime" TEXT,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "approvedOptionId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "ticketPdfKey" TEXT,
    "issuedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "payoutReference" TEXT,
    "payoutFailureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passengers" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passportNumber" TEXT NOT NULL,
    "passportExpiry" TIMESTAMP(3) NOT NULL,
    "nationality" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "passportDocKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_options" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "airline" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paystack_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "PaystackEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "paystack_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_reference_key" ON "wallet_transactions"("reference");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");

-- CreateIndex
CREATE INDEX "wallet_transactions_requestId_idx" ON "wallet_transactions"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "travel_requests_approvedOptionId_key" ON "travel_requests"("approvedOptionId");

-- CreateIndex
CREATE INDEX "travel_requests_status_idx" ON "travel_requests"("status");

-- CreateIndex
CREATE INDEX "travel_requests_assignedAgentId_idx" ON "travel_requests"("assignedAgentId");

-- CreateIndex
CREATE INDEX "travel_requests_clientId_idx" ON "travel_requests"("clientId");

-- CreateIndex
CREATE INDEX "passengers_requestId_idx" ON "passengers"("requestId");

-- CreateIndex
CREATE INDEX "quote_options_requestId_idx" ON "quote_options"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "paystack_events_eventId_key" ON "paystack_events"("eventId");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "travel_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_requests" ADD CONSTRAINT "travel_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_requests" ADD CONSTRAINT "travel_requests_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_requests" ADD CONSTRAINT "travel_requests_approvedOptionId_fkey" FOREIGN KEY ("approvedOptionId") REFERENCES "quote_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "travel_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_options" ADD CONSTRAINT "quote_options_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "travel_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
