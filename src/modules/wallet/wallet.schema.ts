import { z } from "zod";

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

export const initializeTopupBodySchema = z.object({
  // Naira (major unit), not kobo — matches what Paystack's own checkout page displays.
  // Converted to kobo internally before the wallet ledger (which is kobo-denominated) is touched.
  amount: z.number().positive("amount must be a positive number, in Naira"),
});

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type InitializeTopupBody = z.infer<typeof initializeTopupBodySchema>;
