import { z } from "zod";

const MAX_PASSENGERS = 9;

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

export const budgetTierSchema = z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]);

export const requestStatusSchema = z.enum([
  "PENDING",
  "OPTIONS_SENT",
  "APPROVED_LOCKED",
  "ISSUED",
  "COMPLETED",
  "CANCELLED",
]);

export const requestIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listMyRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: requestStatusSchema.optional(),
});

export const queueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: requestStatusSchema.optional(),
  mine: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const adminListRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: requestStatusSchema.optional(),
  clientId: z.string().uuid().optional(),
  assignedAgentId: z.string().uuid().optional(),
});

export const quoteOptionInputSchema = z.object({
  label: z.string().min(1).max(100),
  airline: z.string().min(1).max(100),
  // Kobo, not Naira — matches Wallet.balance/lockedBalance, since this value is locked
  // against the wallet as-is on approval (see wallet.service.ts's koboToNaira comment).
  price: z.number().int().positive().describe("Price in kobo (e.g. 15000000 for ₦150,000)"),
  departureTime: z.coerce.date(),
  details: z.string().max(1000).optional(),
});

export const requestOptionParamSchema = z.object({
  id: z.string().uuid(),
  optionId: z.string().uuid(),
});

export const rejectRequestSchema = z.object({
  reason: z.string().min(3).max(500),
});

export const approveRequestSchema = z.object({
  optionId: z.string().uuid(),
});

export const cancelRequestSchema = z.object({
  reason: z.string().min(3).max(500),
});

export const adminReassignRequestSchema = z.object({
  agentId: z.string().uuid().nullable(),
});

export const adminForceStatusSchema = z.object({
  status: requestStatusSchema,
  reason: z.string().min(3).max(500).optional(),
});

export const passengerInputSchema = z.object({
  fullName: z.string().min(2).max(100),
  passportNumber: z.string().min(5).max(20),
  passportExpiry: z.coerce.date().refine((d) => d.getTime() > Date.now(), {
    message: "Passport expiry must be in the future",
  }),
  nationality: z.string().min(2).max(56),
  dateOfBirth: z.coerce.date().refine((d) => d.getTime() < Date.now(), {
    message: "Date of birth must be in the past",
  }),
});

export const createRequestSchema = z
  .object({
    clientId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    origin: z.string().min(2).max(100),
    destination: z.string().min(2).max(100),
    departureDate: z.coerce.date(),
    returnDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    budgetTier: budgetTierSchema,
    preferredAirline: z.preprocess(emptyToUndefined, z.string().min(1).max(100).optional()),
    preferredTime: z.preprocess(emptyToUndefined, z.string().min(1).max(50).optional()),
    passengers: z.array(passengerInputSchema).min(1).max(MAX_PASSENGERS),
  })
  .refine((data) => data.departureDate.getTime() >= Date.now() - 24 * 60 * 60 * 1000, {
    message: "departureDate must not be in the past",
    path: ["departureDate"],
  })
  .refine((data) => !data.returnDate || data.returnDate.getTime() > data.departureDate.getTime(), {
    message: "returnDate must be after departureDate",
    path: ["returnDate"],
  });

export type PassengerInput = z.infer<typeof passengerInputSchema>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type RequestIdParam = z.infer<typeof requestIdParamSchema>;
export type ListMyRequestsQuery = z.infer<typeof listMyRequestsQuerySchema>;
export type AdminListRequestsQuery = z.infer<typeof adminListRequestsQuerySchema>;
export type QueueQuery = z.infer<typeof queueQuerySchema>;
export type QuoteOptionInput = z.infer<typeof quoteOptionInputSchema>;
export type RequestOptionParam = z.infer<typeof requestOptionParamSchema>;
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;
export type ApproveRequestInput = z.infer<typeof approveRequestSchema>;
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;
export type AdminReassignRequestInput = z.infer<typeof adminReassignRequestSchema>;
export type AdminForceStatusInput = z.infer<typeof adminForceStatusSchema>;
