import { z } from "zod";

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

export const initializeTopupBodySchema = z.object({
  amount: z.number().int().positive("amount must be a positive integer, in kobo"),
});

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type InitializeTopupBody = z.infer<typeof initializeTopupBodySchema>;
