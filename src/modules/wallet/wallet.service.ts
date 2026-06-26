import { randomUUID } from "crypto";
import { Prisma, Wallet, WalletTransactionType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
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

export async function initializeTopup(): Promise<never> {
  throw new ApiError(503, "Topups are not available yet — Paystack integration is pending");
}
