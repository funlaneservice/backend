import { z } from "zod";

export const agentLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createAgentSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
});

export type AgentLoginInput = z.infer<typeof agentLoginSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
