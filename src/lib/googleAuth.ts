import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";

const isConfigured = Boolean(env.googleClientId && env.googleClientSecret && env.googleCallbackUrl);

if (!isConfigured) {
  console.warn(
    "[google-auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL not fully configured — Google sign-in will fail until all three are set."
  );
}

const client = isConfigured
  ? new OAuth2Client(env.googleClientId, env.googleClientSecret, env.googleCallbackUrl)
  : null;

export function isGoogleAuthConfigured(): boolean {
  return isConfigured;
}

export function getGoogleAuthUrl(): string {
  if (!client) {
    throw new Error("Google sign-in is not configured");
  }
  return client.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
  });
}

export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

export async function exchangeCodeForIdentity(code: string): Promise<GoogleIdentity> {
  if (!client || !env.googleClientId) {
    throw new Error("Google sign-in is not configured");
  }

  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new Error("Google did not return an ID token");
  }

  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.googleClientId });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error("Invalid Google ID token");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified ?? false,
    name: payload.name ?? payload.email.split("@")[0],
  };
}
