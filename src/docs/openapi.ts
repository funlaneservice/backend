import { zodToJsonSchema } from "zod-to-json-schema";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../modules/auth/auth.schema";

// `any` param sidesteps a TS instantiation blowup (multi-minute OOM) inferring zodToJsonSchema's generic return type against these chained schemas.
function toSchema(zodSchema: any): Record<string, unknown> {
  return zodToJsonSchema(zodSchema, { target: "openApi3", $refStrategy: "none" }) as Record<string, unknown>;
}

const publicUserSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email" },
    name: { type: "string" },
    role: { type: "string", enum: ["CLIENT", "AGENT", "ADMIN"] },
  },
  required: ["id", "email", "name", "role"],
};

const messageResponseSchema = {
  type: "object",
  properties: { message: { type: "string" } },
  required: ["message"],
};

const errorResponseSchema = {
  type: "object",
  properties: { message: { type: "string" } },
  required: ["message"],
};

const validationErrorResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string", example: "Validation failed" },
    errors: {
      type: "object",
      properties: {
        formErrors: { type: "array", items: { type: "string" } },
        fieldErrors: {
          type: "object",
          additionalProperties: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  required: ["message", "errors"],
};

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const jsonContent = (schema: object) => ({ content: { "application/json": { schema } } });

const responses = {
  validation: { description: "Request body failed validation", ...jsonContent(ref("ValidationErrorResponse")) },
  serverError: { description: "Unexpected server error", ...jsonContent(ref("ErrorResponse")) },
};

export const openapiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Funlane Travel Portal API",
    version: "1.0.0",
    description:
      "Backend API for the Funlane Travel Portal. Phase 1 (Auth) is implemented below; the request/quote/wallet/payments pipeline (Phase 2+) will be added as it ships.",
  },
  servers: [{ url: "/api" }],
  tags: [
    { name: "Health", description: "Service health check" },
    { name: "Auth", description: "Registration, login, email verification, and password reset" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      PublicUser: publicUserSchema,
      MessageResponse: messageResponseSchema,
      ErrorResponse: errorResponseSchema,
      ValidationErrorResponse: validationErrorResponseSchema,
      RegisterRequest: toSchema(registerSchema),
      RegisterResponse: {
        type: "object",
        properties: { message: { type: "string" }, user: ref("PublicUser") },
        required: ["message", "user"],
      },
      LoginRequest: toSchema(loginSchema),
      LoginResponse: {
        type: "object",
        properties: { user: ref("PublicUser"), token: { type: "string" } },
        required: ["user", "token"],
      },
      VerifyEmailRequest: toSchema(verifyEmailSchema),
      ResendVerificationRequest: toSchema(resendVerificationSchema),
      ForgotPasswordRequest: toSchema(forgotPasswordSchema),
      ResetPasswordRequest: toSchema(resetPasswordSchema),
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Service is healthy",
            ...jsonContent({
              type: "object",
              properties: { status: { type: "string", example: "ok" } },
              required: ["status"],
            }),
          },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new client account",
        description:
          "Always creates a CLIENT account (AGENT/ADMIN accounts are seeded, not self-registered). No JWT is issued — the account must be email-verified before logging in.",
        requestBody: { required: true, ...jsonContent(ref("RegisterRequest")) },
        responses: {
          "201": { description: "Registration successful, verification email sent", ...jsonContent(ref("RegisterResponse")) },
          "400": responses.validation,
          "409": { description: "An account with this email already exists", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in with email and password",
        description: "Fails with 403 if the account's email has not been verified yet.",
        requestBody: { required: true, ...jsonContent(ref("LoginRequest")) },
        responses: {
          "200": { description: "Login successful", ...jsonContent(ref("LoginResponse")) },
          "400": responses.validation,
          "401": { description: "Invalid email or password", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Email not verified", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/auth/verify-email": {
      post: {
        tags: ["Auth"],
        summary: "Verify an account using the emailed token",
        requestBody: { required: true, ...jsonContent(ref("VerifyEmailRequest")) },
        responses: {
          "200": { description: "Email verified", ...jsonContent(ref("MessageResponse")) },
          "400": { description: "Invalid, expired, or already-used token", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/auth/resend-verification": {
      post: {
        tags: ["Auth"],
        summary: "Resend the email verification link",
        description: "Always returns 200 with a generic message, whether or not the email exists or is already verified (prevents account enumeration).",
        requestBody: { required: true, ...jsonContent(ref("ResendVerificationRequest")) },
        responses: {
          "200": { description: "Generic confirmation message", ...jsonContent(ref("MessageResponse")) },
          "400": responses.validation,
          "500": responses.serverError,
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request a password reset link",
        description: "Always returns 200 with a generic message, whether or not the email exists (prevents account enumeration).",
        requestBody: { required: true, ...jsonContent(ref("ForgotPasswordRequest")) },
        responses: {
          "200": { description: "Generic confirmation message", ...jsonContent(ref("MessageResponse")) },
          "400": responses.validation,
          "500": responses.serverError,
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using the emailed token",
        description: "Also invalidates all previously-issued JWTs for the account (requireAuth rejects tokens issued before the reset).",
        requestBody: { required: true, ...jsonContent(ref("ResetPasswordRequest")) },
        responses: {
          "200": { description: "Password reset", ...jsonContent(ref("MessageResponse")) },
          "400": { description: "Invalid/expired token, or validation failure", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the current authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Current user", ...jsonContent(ref("PublicUser")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "User not found", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
  },
};
