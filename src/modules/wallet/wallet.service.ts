import { randomUUID } from "crypto";
import { Prisma, Wallet, WalletTransactionType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import * as paystack from "../../lib/paystack";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { ListTransactionsQuery } from "./wallet.schema";

type Tx = Prisma.TransactionClient;

function toWalletView(wallet: Wallet) {
  return {
    balance: wallet.balance,
    lockedBalance: wallet.lockedBalance,
    availableBalance: wallet.balance - wallet.lockedBalance,
    updatedAt: wallet.updatedAt,
  };
}

function toTransactionView(transaction: {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  lockedAfter: number;
  reference: string;
  requestId: string | null;
  createdAt: Date;
}) {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    balanceAfter: transaction.balanceAfter,
    lockedAfter: transaction.lockedAfter,
    reference: transaction.reference,
    requestId: transaction.requestId,
    createdAt: transaction.createdAt,
  };
}

function paginate(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// Caller must already be inside a `prisma.$transaction`. Locks the wallet row for
// the duration of that transaction so concurrent lock/capture/release/credit calls
// against the same wallet serialize instead of racing on stale balances.
async function getLockedWallet(tx: Tx, userId: string): Promise<Wallet> {
  const wallet = await tx.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  await tx.$executeRaw`SELECT 1 FROM wallets WHERE id = ${wallet.id} FOR UPDATE`;
  return tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
}

async function recordTransaction(
  tx: Tx,
  wallet: Wallet,
  type: WalletTransactionType,
  amount: number,
  requestId: string | null,
  reference: string
) {
  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type,
      amount,
      balanceAfter: wallet.balance,
      lockedAfter: wallet.lockedBalance,
      reference,
      requestId,
    },
  });
}

export async function lockFunds(tx: Tx, userId: string, amount: number, requestId: string) {
  const wallet = await getLockedWallet(tx, userId);
  const available = wallet.balance - wallet.lockedBalance;
  if (available < amount) {
    throw new ApiError(409, "Insufficient available balance");
  }

  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { lockedBalance: { increment: amount }, version: { increment: 1 } },
  });

  await recordTransaction(tx, updated, "LOCK", amount, requestId, randomUUID());
  return toWalletView(updated);
}

export async function releaseFunds(tx: Tx, userId: string, amount: number, requestId: string) {
  const wallet = await getLockedWallet(tx, userId);
  if (wallet.lockedBalance < amount) {
    throw new Error(`Cannot release ${amount}, only ${wallet.lockedBalance} is locked`);
  }

  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { lockedBalance: { decrement: amount }, version: { increment: 1 } },
  });

  await recordTransaction(tx, updated, "RELEASE", amount, requestId, randomUUID());
  return toWalletView(updated);
}

export async function captureFunds(tx: Tx, userId: string, amount: number, requestId: string) {
  const wallet = await getLockedWallet(tx, userId);
  if (wallet.lockedBalance < amount) {
    throw new Error(`Cannot capture ${amount}, only ${wallet.lockedBalance} is locked`);
  }

  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: { decrement: amount }, lockedBalance: { decrement: amount }, version: { increment: 1 } },
  });

  await recordTransaction(tx, updated, "CAPTURE", amount, requestId, randomUUID());
  return toWalletView(updated);
}

export async function creditTopup(tx: Tx, userId: string, amount: number, reference: string) {
  const wallet = await getLockedWallet(tx, userId);

  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: { increment: amount }, version: { increment: 1 } },
  });

  await recordTransaction(tx, updated, "TOPUP", amount, null, reference);
  return toWalletView(updated);
}

export async function getWallet(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    return { balance: 0, lockedBalance: 0, availableBalance: 0, updatedAt: null };
  }
  return toWalletView(wallet);
}

export async function getTransactions(userId: string, query: ListTransactionsQuery) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    return { transactions: [], pagination: paginate(0, query.page, query.limit) };
  }

  const where = { walletId: wallet.id };
  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.walletTransaction.count({ where }),
  ]);

  return {
    transactions: transactions.map(toTransactionView),
    pagination: paginate(total, query.page, query.limit),
  };
}

export async function initializeTopup(userId: string, amountKobo: number) {
  if (!paystack.isPaystackConfigured()) {
    throw new ApiError(503, "Topups are not available yet — Paystack is not configured");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  const reference = `topup_${randomUUID()}`;

  const { authorizationUrl, accessCode } = await paystack.initializeTransaction({
    email: user.email,
    amountKobo,
    reference,
    metadata: { userId },
    callbackUrl: `${env.frontendUrl}/wallet/topup/callback`,
  });

  return { authorizationUrl, accessCode, reference };
}

// Called from the webhook route once the signature is verified. Idempotent per
// `eventId` (`<eventType>:<paystack transaction id>`): a PROCESSED row short-circuits
// immediately, and a RECEIVED/FAILED row (e.g. a prior attempt crashed mid-processing)
// is safe to retry since crediting the wallet is itself idempotent on the unique
// WalletTransaction.reference.
export async function handlePaystackWebhook(eventType: string, data: { id: number; reference: string }) {
  const eventId = `${eventType}:${data.id}`;

  const existing = await prisma.paystackEvent.findUnique({ where: { eventId } });
  if (existing?.status === "PROCESSED") {
    return;
  }

  if (!existing) {
    await prisma.paystackEvent.create({
      data: { eventId, eventType, payload: data as unknown as Prisma.InputJsonValue, status: "RECEIVED" },
    });
  }

  try {
    if (eventType === "charge.success") {
      await processChargeSuccess(data.reference);
    }
    await prisma.paystackEvent.update({
      where: { eventId },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
  } catch (err) {
    await prisma.paystackEvent.update({
      where: { eventId },
      data: { status: "FAILED", error: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}

// Re-verifies against the Paystack API rather than trusting the webhook body's amount —
// the signature check proves the request came from Paystack, but the source of truth
// for "did this transaction actually succeed, for how much" is the verify endpoint.
async function processChargeSuccess(reference: string) {
  const verified = await paystack.verifyTransaction(reference);
  if (verified.status !== "success") {
    throw new Error(`Transaction ${reference} verify status is "${verified.status}", not "success"`);
  }

  const userId = (verified.metadata as { userId?: string } | null)?.userId;
  if (!userId) {
    throw new Error(`Transaction ${reference} is missing metadata.userId`);
  }

  try {
    await prisma.$transaction((tx) => creditTopup(tx, userId, verified.amount, verified.reference));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return; // reference already credited by a previous webhook delivery
    }
    throw err;
  }
}
