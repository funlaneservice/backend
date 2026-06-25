import { zodToJsonSchema } from "zod-to-json-schema";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../modules/auth/auth.schema";
import {
  adminLoginSchema,
  bootstrapAdminSchema,
  createAdminSchema,
} from "../modules/admin/admin.schema";
import { agentLoginSchema, createAgentSchema } from "../modules/agent/agent.schema";

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
    { name: "Admin", description: "Admin login and admin account creation" },
    { name: "Agent", description: "Agent login and admin-driven agent onboarding" },
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
      AdminLoginRequest: toSchema(adminLoginSchema),
      AdminLoginResponse: {
        type: "object",
        properties: { admin: ref("PublicUser"), token: { type: "string" } },
        required: ["admin", "token"],
      },
      BootstrapAdminRequest: toSchema(bootstrapAdminSchema),
      BootstrapAdminResponse: {
        type: "object",
        properties: { admin: ref("PublicUser"), token: { type: "string" } },
        required: ["admin", "token"],
      },
      CreateAdminRequest: toSchema(createAdminSchema),
      CreateAdminResponse: {
        type: "object",
        properties: { admin: ref("PublicUser") },
        required: ["admin"],
      },
      AgentLoginRequest: toSchema(agentLoginSchema),
      AgentLoginResponse: {
        type: "object",
        properties: { agent: ref("PublicUser"), token: { type: "string" } },
        required: ["agent", "token"],
      },
      CreateAgentRequest: toSchema(createAgentSchema),
      CreateAgentResponse: {
        type: "object",
        properties: { agent: ref("PublicUser") },
        required: ["agent"],
      },
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
    "/admin/auth/login": {
      post: {
        tags: ["Admin"],
        summary: "Log in to an admin account",
        description: "Fails with 403 if the account exists but does not have the ADMIN role.",
        requestBody: { required: true, ...jsonContent(ref("AdminLoginRequest")) },
        responses: {
          "200": { description: "Login successful", ...jsonContent(ref("AdminLoginResponse")) },
          "400": responses.validation,
          "401": { description: "Invalid email or password", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Account is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/admin/auth/bootstrap": {
      post: {
        tags: ["Admin"],
        summary: "Create the first admin account",
        description:
          "One-time bootstrap: only succeeds while zero ADMIN accounts exist. Once an admin exists, use POST /admin/admins (authenticated as an admin) to create more.",
        requestBody: { required: true, ...jsonContent(ref("BootstrapAdminRequest")) },
        responses: {
          "201": { description: "Admin created", ...jsonContent(ref("BootstrapAdminResponse")) },
          "400": responses.validation,
          "403": { description: "An admin account already exists", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "An account with this email already exists", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/admin/admins": {
      post: {
        tags: ["Admin"],
        summary: "Create a new admin account",
        description: "Requires an authenticated ADMIN. The new admin's email is marked verified immediately (no verification email flow).",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, ...jsonContent(ref("CreateAdminRequest")) },
        responses: {
          "201": { description: "Admin created", ...jsonContent(ref("CreateAdminResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "An account with this email already exists", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/agent/auth/login": {
      post: {
        tags: ["Agent"],
        summary: "Log in to an agent account",
        description: "Fails with 403 if the account exists but does not have the AGENT role.",
        requestBody: { required: true, ...jsonContent(ref("AgentLoginRequest")) },
        responses: {
          "200": { description: "Login successful", ...jsonContent(ref("AgentLoginResponse")) },
          "400": responses.validation,
          "401": { description: "Invalid email or password", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Account is not an agent", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/admin/agents": {
      post: {
        tags: ["Agent"],
        summary: "Onboard a new agent",
        description:
          "Requires an authenticated ADMIN. Creates the agent with a random unusable password and emails them an invite link (reusing the password-reset token flow) to set their own password via POST /auth/reset-password.",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, ...jsonContent(ref("CreateAgentRequest")) },
        responses: {
          "201": { description: "Agent created and invited", ...jsonContent(ref("CreateAgentResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "An account with this email already exists", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
  },
};
