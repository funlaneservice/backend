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
import { changeUserRoleSchema, updateUserSchema } from "../modules/users/users.schema";
import {
  approveRequestSchema,
  cancelRequestSchema,
  quoteOptionInputSchema,
  rejectRequestSchema,
} from "../modules/requests/requests.schema";

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
    { name: "Users", description: "Admin management of all user accounts (CLIENT/AGENT/ADMIN)" },
    { name: "Requests", description: "Client-submitted travel requests" },
    { name: "Wallet", description: "Client wallet balance and transaction ledger" },
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
      AdminUserView: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          phone: { type: "string" },
          role: { type: "string", enum: ["CLIENT", "AGENT", "ADMIN"] },
          status: { type: "string", enum: ["ACTIVE", "SUSPENDED"] },
          emailVerifiedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
        required: ["id", "email", "name", "phone", "role", "status", "emailVerifiedAt", "createdAt"],
      },
      ListUsersResponse: {
        type: "object",
        properties: {
          users: { type: "array", items: ref("AdminUserView") },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
            required: ["page", "limit", "total", "totalPages"],
          },
        },
        required: ["users", "pagination"],
      },
      UserResponse: {
        type: "object",
        properties: { user: ref("AdminUserView") },
        required: ["user"],
      },
      UpdateUserRequest: toSchema(updateUserSchema),
      ChangeUserRoleRequest: toSchema(changeUserRoleSchema),
      PassengerView: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          fullName: { type: "string" },
          passportNumber: { type: "string" },
          passportExpiry: { type: "string", format: "date-time" },
          nationality: { type: "string" },
          dateOfBirth: { type: "string", format: "date-time" },
        },
        required: ["id", "fullName", "passportNumber", "passportExpiry", "nationality", "dateOfBirth"],
      },
      QuoteOptionView: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          label: { type: "string" },
          airline: { type: "string" },
          price: { type: "integer", description: "Price in kobo" },
          departureTime: { type: "string", format: "date-time" },
          details: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
        required: ["id", "label", "airline", "price", "departureTime", "createdAt"],
      },
      TravelRequestView: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          status: {
            type: "string",
            enum: ["PENDING", "OPTIONS_SENT", "APPROVED_LOCKED", "ISSUED", "COMPLETED", "CANCELLED"],
          },
          origin: { type: "string" },
          destination: { type: "string" },
          departureDate: { type: "string", format: "date-time" },
          returnDate: { type: "string", format: "date-time", nullable: true },
          budgetTier: { type: "string", enum: ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] },
          preferredAirline: { type: "string", nullable: true },
          preferredTime: { type: "string", nullable: true },
          assignedAgentId: { type: "string", format: "uuid", nullable: true },
          rejectionReason: { type: "string", nullable: true },
          issuedAt: { type: "string", format: "date-time", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          cancelledAt: { type: "string", format: "date-time", nullable: true },
          cancellationReason: { type: "string", nullable: true },
          payoutStatus: { type: "string", enum: ["NOT_APPLICABLE", "PENDING", "SUCCESS", "FAILED"] },
          ticketDownloadUrl: { type: "string", nullable: true, description: "Short-lived signed URL, null until issued" },
          createdAt: { type: "string", format: "date-time" },
          passengers: { type: "array", items: ref("PassengerView") },
          quoteOptions: { type: "array", items: ref("QuoteOptionView") },
        },
        required: [
          "id",
          "status",
          "origin",
          "destination",
          "departureDate",
          "budgetTier",
          "assignedAgentId",
          "rejectionReason",
          "issuedAt",
          "completedAt",
          "cancelledAt",
          "cancellationReason",
          "payoutStatus",
          "ticketDownloadUrl",
          "createdAt",
          "passengers",
          "quoteOptions",
        ],
      },
      RequestResponse: {
        type: "object",
        properties: { request: ref("TravelRequestView") },
        required: ["request"],
      },
      AddQuoteOptionRequest: toSchema(quoteOptionInputSchema),
      QuoteOptionResponse: {
        type: "object",
        properties: { option: ref("QuoteOptionView") },
        required: ["option"],
      },
      RejectRequestRequest: toSchema(rejectRequestSchema),
      ApproveRequestRequest: toSchema(approveRequestSchema),
      CancelRequestRequest: toSchema(cancelRequestSchema),
      WalletView: {
        type: "object",
        properties: {
          balance: { type: "integer", description: "Total funds, in kobo" },
          lockedBalance: { type: "integer", description: "Reserved against approved-but-uncaptured requests, in kobo" },
          availableBalance: { type: "integer", description: "balance - lockedBalance, in kobo" },
          updatedAt: { type: "string", format: "date-time", nullable: true },
        },
        required: ["balance", "lockedBalance", "availableBalance", "updatedAt"],
      },
      WalletResponse: {
        type: "object",
        properties: { wallet: ref("WalletView") },
        required: ["wallet"],
      },
      WalletTransactionView: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: { type: "string", enum: ["TOPUP", "LOCK", "CAPTURE", "RELEASE", "PAYOUT_DEBIT", "ADJUSTMENT"] },
          amount: { type: "integer", description: "Always positive, in kobo" },
          balanceAfter: { type: "integer" },
          lockedAfter: { type: "integer" },
          reference: { type: "string" },
          requestId: { type: "string", format: "uuid", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
        required: ["id", "type", "amount", "balanceAfter", "lockedAfter", "reference", "requestId", "createdAt"],
      },
      TransactionListResponse: {
        type: "object",
        properties: {
          transactions: { type: "array", items: ref("WalletTransactionView") },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
            required: ["page", "limit", "total", "totalPages"],
          },
        },
        required: ["transactions", "pagination"],
      },
      RequestSummaryView: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          status: {
            type: "string",
            enum: ["PENDING", "OPTIONS_SENT", "APPROVED_LOCKED", "ISSUED", "COMPLETED", "CANCELLED"],
          },
          origin: { type: "string" },
          destination: { type: "string" },
          departureDate: { type: "string", format: "date-time" },
          returnDate: { type: "string", format: "date-time", nullable: true },
          budgetTier: { type: "string", enum: ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] },
          preferredAirline: { type: "string", nullable: true },
          preferredTime: { type: "string", nullable: true },
          assignedAgentId: { type: "string", format: "uuid", nullable: true },
          passengerCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
        required: [
          "id",
          "status",
          "origin",
          "destination",
          "departureDate",
          "budgetTier",
          "assignedAgentId",
          "passengerCount",
          "createdAt",
        ],
      },
      RequestListResponse: {
        type: "object",
        properties: {
          requests: { type: "array", items: ref("RequestSummaryView") },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
            required: ["page", "limit", "total", "totalPages"],
          },
        },
        required: ["requests", "pagination"],
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
    "/admin/users": {
      get: {
        tags: ["Users"],
        summary: "List/search users",
        description: "Requires an authenticated ADMIN. Supports pagination and filtering by role, status, and a name/email search term.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "role", in: "query", schema: { type: "string", enum: ["CLIENT", "AGENT", "ADMIN"] } },
          { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "SUSPENDED"] } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Paginated list of users", ...jsonContent(ref("ListUsersResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/admin/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get a single user",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "User detail", ...jsonContent(ref("UserResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "User not found", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update a user's name/phone",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, ...jsonContent(ref("UpdateUserRequest")) },
        responses: {
          "200": { description: "User updated", ...jsonContent(ref("UserResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "User not found", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Permanently delete a user",
        description: "An admin cannot delete their own account.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "User deleted", ...jsonContent(ref("MessageResponse")) },
          "400": { description: "Cannot delete your own account", ...jsonContent(ref("ErrorResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "User not found", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/admin/users/{id}/role": {
      patch: {
        tags: ["Users"],
        summary: "Change a user's role",
        description: "An admin cannot change their own role.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, ...jsonContent(ref("ChangeUserRoleRequest")) },
        responses: {
          "200": { description: "Role changed", ...jsonContent(ref("UserResponse")) },
          "400": { description: "Validation failure, or attempted to change own role", ...jsonContent(ref("ErrorResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "User not found", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/admin/users/{id}/suspend": {
      post: {
        tags: ["Users"],
        summary: "Suspend a user",
        description: "Blocks login and immediately invalidates active sessions (checked in requireAuth). An admin cannot suspend their own account.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "User suspended", ...jsonContent(ref("UserResponse")) },
          "400": { description: "Attempted to suspend own account", ...jsonContent(ref("ErrorResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "User not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "User is already suspended", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/admin/users/{id}/reactivate": {
      post: {
        tags: ["Users"],
        summary: "Reactivate a suspended user",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "User reactivated", ...jsonContent(ref("UserResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "User not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "User is already active", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests": {
      post: {
        tags: ["Requests"],
        summary: "Submit a new travel request",
        description:
          "Requires an authenticated CLIENT. Multipart upload: `passengers` is a JSON-encoded array of passenger objects, and `passportDocs` must contain exactly one file per passenger, in the same order.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  origin: { type: "string" },
                  destination: { type: "string" },
                  departureDate: { type: "string", format: "date" },
                  returnDate: { type: "string", format: "date" },
                  budgetTier: { type: "string", enum: ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] },
                  preferredAirline: { type: "string" },
                  preferredTime: { type: "string" },
                  passengers: {
                    type: "string",
                    description:
                      "JSON-encoded array of { fullName, passportNumber, passportExpiry, nationality, dateOfBirth }",
                  },
                  passportDocs: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                    description: "One passport scan (JPEG/PNG/PDF) per passenger, same order as `passengers`",
                  },
                },
                required: ["origin", "destination", "departureDate", "budgetTier", "passengers", "passportDocs"],
              },
            },
          },
        },
        responses: {
          "201": { description: "Request created", ...jsonContent(ref("RequestResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not a client", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/mine": {
      get: {
        tags: ["Requests"],
        summary: "List the authenticated client's own travel requests",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["PENDING", "OPTIONS_SENT", "APPROVED_LOCKED", "ISSUED", "COMPLETED", "CANCELLED"],
            },
          },
        ],
        responses: {
          "200": { description: "Paginated list of the client's requests", ...jsonContent(ref("RequestListResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not a client", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/queue": {
      get: {
        tags: ["Requests"],
        summary: "Browse the shared agent queue",
        description:
          "Requires an authenticated AGENT or ADMIN. By default returns the unclaimed pool (status PENDING, unassigned). Pass `mine=true` to see the requests currently assigned to the caller instead.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["PENDING", "OPTIONS_SENT", "APPROVED_LOCKED", "ISSUED", "COMPLETED", "CANCELLED"],
            },
          },
          { name: "mine", in: "query", schema: { type: "string", enum: ["true", "false"] } },
        ],
        responses: {
          "200": { description: "Paginated queue", ...jsonContent(ref("RequestListResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an agent or admin", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}/claim": {
      post: {
        tags: ["Requests"],
        summary: "Claim an unassigned request from the queue",
        description:
          "Requires an authenticated AGENT. Atomic conditional update — only succeeds if the request is still PENDING and unassigned at the moment of the call, so two agents racing on the same request can't both win.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Request claimed", ...jsonContent(ref("RequestResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an agent", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "Request has already been claimed by another agent", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}/options": {
      post: {
        tags: ["Requests"],
        summary: "Add a quote option to a request",
        description:
          "Requires the AGENT currently assigned to this request. Only allowed while the request is PENDING or OPTIONS_SENT.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, ...jsonContent(ref("AddQuoteOptionRequest")) },
        responses: {
          "201": { description: "Quote option created", ...jsonContent(ref("QuoteOptionResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Caller is not the agent assigned to this request", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "Request is not in an editable status", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}/options/{optionId}": {
      delete: {
        tags: ["Requests"],
        summary: "Remove a quote option from a request",
        description:
          "Requires the AGENT currently assigned to this request. Only allowed while the request is PENDING or OPTIONS_SENT.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "optionId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": { description: "Quote option deleted", ...jsonContent(ref("MessageResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Caller is not the agent assigned to this request", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request or quote option not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "Request is not in an editable status", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}/send-options": {
      post: {
        tags: ["Requests"],
        summary: "Send the added quote options to the client",
        description:
          "Requires the AGENT currently assigned to this request. Transitions PENDING -> OPTIONS_SENT. Fails if no quote options have been added yet.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Options sent", ...jsonContent(ref("RequestResponse")) },
          "400": { description: "No quote options have been added yet", ...jsonContent(ref("ErrorResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Caller is not the agent assigned to this request", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "Request is not PENDING", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}/reject": {
      post: {
        tags: ["Requests"],
        summary: "Reject the sent quote options",
        description:
          "Requires the request's own CLIENT. Reverts status from OPTIONS_SENT back to PENDING — the same agent stays assigned and revises the quote.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, ...jsonContent(ref("RejectRequestRequest")) },
        responses: {
          "200": { description: "Request rejected and reverted to PENDING", ...jsonContent(ref("RequestResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "Request is not OPTIONS_SENT", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}/approve": {
      post: {
        tags: ["Requests"],
        summary: "Approve a quote option, locking wallet funds",
        description:
          "Requires the request's own CLIENT. Only allowed from OPTIONS_SENT. Locks the option's price against the client's wallet (409 if available balance is insufficient) and transitions to APPROVED_LOCKED, atomically with the wallet lock.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, ...jsonContent(ref("ApproveRequestRequest")) },
        responses: {
          "200": { description: "Request approved and funds locked", ...jsonContent(ref("RequestResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request or quote option not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "Request is not OPTIONS_SENT, or insufficient wallet balance", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}/cancel": {
      post: {
        tags: ["Requests"],
        summary: "Cancel an approved request, releasing locked wallet funds",
        description:
          "Requires the request's own CLIENT. Only allowed from APPROVED_LOCKED (blocked once ISSUED). Releases the locked funds back to available balance and transitions to CANCELLED.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, ...jsonContent(ref("CancelRequestRequest")) },
        responses: {
          "200": { description: "Request cancelled and funds released", ...jsonContent(ref("RequestResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "Request is not APPROVED_LOCKED", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}/ticket": {
      post: {
        tags: ["Requests"],
        summary: "Upload the issued ticket, transitioning to ISSUED",
        description:
          "Requires the AGENT currently assigned to this request. Only allowed from APPROVED_LOCKED. Multipart upload, field name `ticket`.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { ticket: { type: "string", format: "binary" } },
                required: ["ticket"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Ticket uploaded, request issued", ...jsonContent(ref("RequestResponse")) },
          "400": { description: "Ticket file missing or invalid type", ...jsonContent(ref("ErrorResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Caller is not the agent assigned to this request", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "Request is not APPROVED_LOCKED", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}/complete": {
      post: {
        tags: ["Requests"],
        summary: "Mark a request complete, capturing wallet funds",
        description:
          "Requires the AGENT currently assigned to this request. Only allowed from ISSUED. Captures the locked funds (moves them out of the wallet entirely) and transitions to COMPLETED, setting payoutStatus to PENDING.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Request completed and funds captured", ...jsonContent(ref("RequestResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Caller is not the agent assigned to this request", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "Request is not ISSUED", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}": {
      get: {
        tags: ["Requests"],
        summary: "Get a single travel request",
        description:
          "Requires authentication. A CLIENT can only view their own requests (others 404). AGENT/ADMIN can view any request.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Request detail", ...jsonContent(ref("RequestResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request not found", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/wallet/me": {
      get: {
        tags: ["Wallet"],
        summary: "Get the authenticated client's wallet balance",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Wallet balance", ...jsonContent(ref("WalletResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not a client", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/wallet/me/transactions": {
      get: {
        tags: ["Wallet"],
        summary: "List the authenticated client's wallet ledger",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": { description: "Paginated transaction ledger", ...jsonContent(ref("TransactionListResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not a client", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/wallet/topup/initialize": {
      post: {
        tags: ["Wallet"],
        summary: "Initialize a Paystack topup",
        description: "Not yet available — Paystack integration is pending. Always returns 503 for now.",
        security: [{ bearerAuth: [] }],
        responses: {
          "503": { description: "Topups are not available yet", ...jsonContent(ref("ErrorResponse")) },
        },
      },
    },
    "/wallet/{userId}": {
      get: {
        tags: ["Wallet"],
        summary: "Get any user's wallet balance",
        description: "Requires an authenticated ADMIN.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Wallet balance", ...jsonContent(ref("WalletResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/wallet/{userId}/transactions": {
      get: {
        tags: ["Wallet"],
        summary: "List any user's wallet ledger",
        description: "Requires an authenticated ADMIN.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": { description: "Paginated transaction ledger", ...jsonContent(ref("TransactionListResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
  },
};
