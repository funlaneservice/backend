import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";

const isConfigured = Boolean(env.googleClientId);

if (!isConfigured) {
  console.warn(
    "[google-auth] GOOGLE_CLIENT_ID not configured — Google sign-in will fail until it is set."
  );
}

const client = isConfigured ? new OAuth2Client(env.googleClientId) : null;

export function isGoogleAuthConfigured(): boolean {
  return isConfigured;
}

export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  if (!client || !env.googleClientId) {
    throw new Error("Google sign-in is not configured");
  }

  const ticket = await client.verifyIdToken({ idToken, audience: env.googleClientId });
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
