import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const bootstrapAdminSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  password: z.string().min(8).max(72),
});

export const createAdminSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  password: z.string().min(8).max(72),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type BootstrapAdminInput = z.infer<typeof bootstrapAdminSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
