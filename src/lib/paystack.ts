import crypto from "crypto";
import { env } from "../config/env";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const isConfigured = Boolean(env.paystackSecretKey);

if (!isConfigured) {
  console.warn(
    "[paystack] PAYSTACK_SECRET_KEY not configured — wallet topups will fail until it is set."
  );
}

export function isPaystackConfigured(): boolean {
  return isConfigured;
}

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

async function paystackRequest<T>(path: string, init: RequestInit): Promise<T> {
  if (!env.paystackSecretKey) {
    throw new Error("Paystack is not configured");
  }

  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = (await res.json()) as PaystackResponse<T>;
  if (!res.ok || !body.status) {
    throw new Error(`Paystack request to ${path} failed: ${body.message}`);
  }
  return body.data;
}

export interface InitializeTransactionParams {
  email: string;
  amountKobo: number;
  reference: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export async function initializeTransaction(
  params: InitializeTransactionParams
): Promise<InitializeTransactionResult> {
  const data = await paystackRequest<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      metadata: params.metadata,
      callback_url: params.callbackUrl,
    }),
  });

  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
  };
}

export interface VerifiedTransaction {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  metadata: Record<string, unknown> | null;
  customer: { email: string };
}

export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  return paystackRequest<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  });
}

// Paystack signs webhook payloads with HMAC-SHA512 over the raw request body, keyed
// by the secret key. Comparison is timing-safe to avoid leaking the expected hash
// through response-time side channels.
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature || !env.paystackSecretKey) {
    return false;
  }

  const expected = crypto.createHmac("sha512", env.paystackSecretKey).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
