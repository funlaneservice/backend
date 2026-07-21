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
  adminForceStatusSchema,
  adminReassignRequestSchema,
  approveRequestSchema,
  cancelRequestSchema,
  quoteOptionInputSchema,
  rejectRequestSchema,
} from "../modules/requests/requests.schema";
import { initializeTopupBodySchema } from "../modules/wallet/wallet.schema";
import { changePasswordSchema, updateProfileSchema } from "../modules/settings/settings.schema";
import { AUDIT_ACTIONS, AUDIT_STATUSES } from "../modules/audit/audit.schema";

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
    { name: "Audit", description: "Security audit log of authentication and admin/user-management actions" },
    { name: "Requests", description: "Client-submitted travel requests" },
    { name: "Wallet", description: "Client wallet balance and transaction ledger" },
    { name: "Settings", description: "Self-service profile and password management for CLIENT/AGENT accounts" },
    { name: "Notifications", description: "In-app notifications for the authenticated user" },
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
          phone: { type: "string", nullable: true },
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
      AuditLogView: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          action: { type: "string", enum: AUDIT_ACTIONS },
          status: { type: "string", enum: AUDIT_STATUSES },
          actorId: { type: "string", format: "uuid", nullable: true, description: "Null for unauthenticated attempts, e.g. a failed login" },
          actorEmail: { type: "string", nullable: true },
          actorRole: { type: "string", nullable: true },
          targetType: { type: "string", nullable: true },
          targetId: { type: "string", nullable: true },
          ipAddress: { type: "string", nullable: true },
          userAgent: { type: "string", nullable: true },
          metadata: { type: "object", nullable: true, additionalProperties: true },
          createdAt: { type: "string", format: "date-time" },
        },
        required: [
          "id",
          "action",
          "status",
          "actorId",
          "actorEmail",
          "actorRole",
          "targetType",
          "targetId",
          "ipAddress",
          "userAgent",
          "metadata",
          "createdAt",
        ],
      },
      AuditLogListResponse: {
        type: "object",
        properties: {
          logs: { type: "array", items: ref("AuditLogView") },
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
        required: ["logs", "pagination"],
      },
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
          price: { type: "number", description: "Price in Naira" },
          departureTime: { type: "string", format: "date-time" },
          details: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          isSelected: { type: "boolean", description: "True if this is the client's approved/selected option" },
        },
        required: ["id", "label", "airline", "price", "departureTime", "createdAt", "isSelected"],
      },
      TravelRequestView: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          clientId: { type: "string", format: "uuid" },
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
          approvedOptionId: { type: "string", format: "uuid", nullable: true, description: "ID of the client's approved/selected quote option" },
          createdAt: { type: "string", format: "date-time" },
          passengers: { type: "array", items: ref("PassengerView") },
          quoteOptions: { type: "array", items: ref("QuoteOptionView") },
        },
        required: [
          "id",
          "clientId",
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
          "approvedOptionId",
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
      AdminReassignRequestRequest: toSchema(adminReassignRequestSchema),
      AdminForceStatusRequest: toSchema(adminForceStatusSchema),
      WalletView: {
        type: "object",
        properties: {
          balance: { type: "number", description: "Total funds, in Naira" },
          lockedBalance: { type: "number", description: "Reserved against approved-but-uncaptured requests, in Naira" },
          availableBalance: { type: "number", description: "balance - lockedBalance, in Naira" },
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
          amount: { type: "number", description: "Always positive, in Naira" },
          balanceAfter: { type: "number" },
          lockedAfter: { type: "number" },
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
      TopupInitializeRequest: toSchema(initializeTopupBodySchema),
      TopupInitializeResponse: {
        type: "object",
        properties: {
          authorizationUrl: { type: "string", description: "Paystack-hosted checkout page to redirect the client to" },
          accessCode: { type: "string" },
          reference: { type: "string", description: "Wallet is credited once this reference's charge.success webhook is verified" },
        },
        required: ["authorizationUrl", "accessCode", "reference"],
      },
      NotificationView: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: {
            type: "string",
            enum: ["OPTIONS_SENT", "REQUEST_APPROVED", "REQUEST_REJECTED", "TICKET_COMPLETED", "WALLET_TOPUP"],
          },
          title: { type: "string" },
          message: { type: "string" },
          requestId: { type: "string", format: "uuid", nullable: true },
          readAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
        required: ["id", "type", "title", "message", "requestId", "readAt", "createdAt"],
      },
      NotificationListResponse: {
        type: "object",
        properties: {
          notifications: { type: "array", items: ref("NotificationView") },
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
        required: ["notifications", "pagination"],
      },
      NotificationResponse: {
        type: "object",
        properties: { notification: ref("NotificationView") },
        required: ["notification"],
      },
      UnreadCountResponse: {
        type: "object",
        properties: { count: { type: "integer" } },
        required: ["count"],
      },
      MarkAllReadResponse: {
        type: "object",
        properties: { count: { type: "integer", description: "Number of notifications marked as read" } },
        required: ["count"],
      },
      RequestSummaryView: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          clientId: { type: "string", format: "uuid" },
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
          "clientId",
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
      SettingsProfileView: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          phone: { type: "string", nullable: true },
          role: { type: "string", enum: ["CLIENT", "AGENT", "ADMIN"] },
          status: { type: "string", enum: ["ACTIVE", "SUSPENDED"] },
        },
        required: ["id", "email", "name", "phone", "role", "status"],
      },
      SettingsProfileResponse: {
        type: "object",
        properties: { user: ref("SettingsProfileView") },
        required: ["user"],
      },
      UpdateProfileRequest: toSchema(updateProfileSchema),
      ChangePasswordRequest: toSchema(changePasswordSchema),
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
    "/auth/google": {
      get: {
        tags: ["Auth"],
        summary: "Start Google sign-in",
        description:
          "Not meant to be called via fetch/AJAX — this is a plain browser navigation target (e.g. a link's href or window.location redirect). Redirects (302) to Google's OAuth consent screen. If Google sign-in isn't configured, redirects to the frontend's callback route with an `error` query param instead of returning JSON.",
        responses: {
          "302": { description: "Redirect to Google's consent screen, or to the frontend error callback if unconfigured" },
        },
      },
    },
    "/auth/google/callback": {
      get: {
        tags: ["Auth"],
        summary: "Google OAuth callback",
        description:
          "Never called directly by the frontend — Google redirects the browser here after the user consents. Exchanges the authorization code for the user's Google identity, then finds an existing user by Google ID, links to an existing password account by matching email, or creates a new CLIENT account (email is auto-verified since Google already verified it; phone is left unset — the client should complete it later via PATCH /settings/profile). Always redirects (302) to `${FRONTEND_URL}/auth/google/callback` with either `?token=<jwt>` on success or `?error=<reason>` on failure — never returns a JSON body, since the browser is mid-navigation.",
        parameters: [
          { name: "code", in: "query", schema: { type: "string" }, description: "Authorization code from Google" },
          { name: "error", in: "query", schema: { type: "string" }, description: "Present if the user denied consent at Google" },
        ],
        responses: {
          "302": { description: "Redirect to the frontend's callback route with ?token=... on success or ?error=... on failure" },
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
    "/admin/audit-logs": {
      get: {
        tags: ["Audit"],
        summary: "List/search the security audit log",
        description:
          "Requires an authenticated ADMIN. Covers auth (login/register/password reset/email verification) and admin/user-management actions (role changes, suspensions, admin/agent creation, etc.), each with actor, status, and source IP/user-agent.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "action", in: "query", schema: { type: "string", enum: AUDIT_ACTIONS } },
          { name: "status", in: "query", schema: { type: "string", enum: AUDIT_STATUSES } },
          { name: "actorId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "targetType", in: "query", schema: { type: "string" } },
          { name: "targetId", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Matches actorEmail (contains, case-insensitive)" },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          "200": { description: "Paginated list of audit log entries", ...jsonContent(ref("AuditLogListResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests": {
      post: {
        tags: ["Requests"],
        summary: "Submit a new travel request",
        description:
          "Requires an authenticated CLIENT (creates the request under their own account), or an ADMIN creating a request on behalf of any client (must pass `clientId`, the id of an existing CLIENT user, in the form body). Multipart upload: `passengers` is a JSON-encoded array of passenger objects, and `passportDocs` must contain exactly one file per passenger, in the same order.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  clientId: {
                    type: "string",
                    format: "uuid",
                    description: "Required and only honored when the caller is an ADMIN; ignored for CLIENT callers, who always create the request under their own account.",
                  },
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
          "400": {
            description: "Validation error, or (ADMIN caller) clientId missing/not an existing client",
            ...jsonContent(ref("ErrorResponse")),
          },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is neither a client nor an admin", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
      get: {
        tags: ["Requests"],
        summary: "List/search all travel requests",
        description: "Requires an authenticated ADMIN. Supports filtering by status, clientId, and assignedAgentId.",
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
          { name: "clientId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "assignedAgentId", in: "query", schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": { description: "Paginated list of all requests", ...jsonContent(ref("RequestListResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not an admin", ...jsonContent(ref("ErrorResponse")) },
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
          "Requires an authenticated AGENT (not ADMIN — admins should use PATCH /requests/{id}/assign to assign a specific agent instead of claiming for themselves). Atomic conditional update — only succeeds if the request is still PENDING and unassigned at the moment of the call, so two agents racing on the same request can't both win.",
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
          "Requires the AGENT currently assigned to this request, or an ADMIN acting on any request. Only allowed while the request is PENDING or OPTIONS_SENT. `price` is in Naira (converted to kobo internally before it's stored, and before it's later locked against the client's wallet on approval).",
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
          "Requires the AGENT currently assigned to this request, or an ADMIN acting on any request. Only allowed while the request is PENDING or OPTIONS_SENT.",
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
          "Requires the AGENT currently assigned to this request, or an ADMIN acting on any request. Transitions PENDING -> OPTIONS_SENT. Fails if no quote options have been added yet.",
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
          "Requires the request's own CLIENT, or an ADMIN acting on any request. Reverts status from OPTIONS_SENT back to PENDING — the same agent stays assigned and revises the quote.",
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
          "Requires the request's own CLIENT, or an ADMIN acting on any request (funds are always locked against the request's own client, never the admin). Only allowed from OPTIONS_SENT. Locks the option's price against the client's wallet (409 if available balance is insufficient) and transitions to APPROVED_LOCKED, atomically with the wallet lock.",
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
          "Requires the request's own CLIENT, or an ADMIN acting on any request. Only allowed from APPROVED_LOCKED (blocked once ISSUED) — for other statuses, admins should use POST /requests/{id}/admin-cancel instead. Releases the locked funds back to available balance and transitions to CANCELLED.",
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
    "/requests/{id}/admin-cancel": {
      post: {
        tags: ["Requests"],
        summary: "Force-cancel any request as an admin",
        description:
          "Requires an authenticated ADMIN. Works on PENDING, OPTIONS_SENT, or APPROVED_LOCKED requests regardless of owner (blocked once ISSUED, COMPLETED, or CANCELLED). Releases any locked wallet funds and transitions to CANCELLED.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, ...jsonContent(ref("CancelRequestRequest")) },
        responses: {
          "200": { description: "Request cancelled and any locked funds released", ...jsonContent(ref("RequestResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Caller is not an ADMIN", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "Request is ISSUED, COMPLETED, or already CANCELLED", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}/assign": {
      patch: {
        tags: ["Requests"],
        summary: "Reassign or unassign the agent on a request",
        description:
          "Requires an authenticated ADMIN. Bypasses the normal claim rule (agents may only self-claim unassigned PENDING requests). Pass agentId: null to unassign back to the shared queue. Blocked once the request is COMPLETED or CANCELLED.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, ...jsonContent(ref("AdminReassignRequestRequest")) },
        responses: {
          "200": { description: "Agent reassigned", ...jsonContent(ref("RequestResponse")) },
          "400": { description: "agentId does not belong to an active AGENT", ...jsonContent(ref("ErrorResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Caller is not an ADMIN", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "Request is COMPLETED or CANCELLED", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}/status": {
      patch: {
        tags: ["Requests"],
        summary: "Force a request directly into any status",
        description:
          "Requires an authenticated ADMIN. Bypasses the normal state machine entirely and does NOT lock, release, or capture wallet funds — use with care, and reconcile the wallet manually via the admin wallet views if the forced status crosses an APPROVED_LOCKED/COMPLETED boundary.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, ...jsonContent(ref("AdminForceStatusRequest")) },
        responses: {
          "200": { description: "Status forced", ...jsonContent(ref("RequestResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Caller is not an ADMIN", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Request not found", ...jsonContent(ref("ErrorResponse")) },
          "409": { description: "Request is already in the requested status", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/requests/{id}/ticket": {
      post: {
        tags: ["Requests"],
        summary: "Upload the issued ticket, transitioning to ISSUED",
        description:
          "Requires the AGENT currently assigned to this request, or an ADMIN acting on any request. Only allowed from APPROVED_LOCKED. Multipart upload, field name `ticket`.",
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
          "Requires the AGENT currently assigned to this request, or an ADMIN acting on any request. Only allowed from ISSUED. Captures the locked funds (moves them out of the wallet entirely) and transitions to COMPLETED, setting payoutStatus to PENDING.",
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
        description:
          "Returns a Paystack-hosted checkout URL for the given amount, in Naira (converted to kobo before reaching Paystack — the wallet ledger itself stays kobo-denominated). The wallet is credited asynchronously once /wallet/webhook/paystack verifies the resulting charge.success event — not immediately on this response.",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, ...jsonContent(ref("TopupInitializeRequest")) },
        responses: {
          "200": { description: "Paystack checkout initialized", ...jsonContent(ref("TopupInitializeResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not a client", ...jsonContent(ref("ErrorResponse")) },
          "503": { description: "Paystack is not configured", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/wallet/webhook/paystack": {
      post: {
        tags: ["Wallet"],
        summary: "Paystack webhook (charge.success credits the wallet)",
        description:
          "Called by Paystack, not by clients. Verifies the X-Paystack-Signature header (HMAC-SHA512 over the raw body, keyed by the secret key) rather than a bearer token. Idempotent per event via the paystack_events table.",
        responses: {
          "200": { description: "Event acknowledged (processed, or already processed)" },
          "400": { description: "Malformed payload", ...jsonContent(ref("ErrorResponse")) },
          "401": { description: "Missing or invalid signature", ...jsonContent(ref("ErrorResponse")) },
          "500": { description: "Processing failed — Paystack should retry delivery" },
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
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List the authenticated user's in-app notifications",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "unreadOnly", in: "query", schema: { type: "boolean", default: false } },
        ],
        responses: {
          "200": { description: "Paginated notifications, newest first", ...jsonContent(ref("NotificationListResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/notifications/unread-count": {
      get: {
        tags: ["Notifications"],
        summary: "Get the authenticated user's unread notification count",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Unread count", ...jsonContent(ref("UnreadCountResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all of the authenticated user's notifications as read",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Number of notifications marked as read", ...jsonContent(ref("MarkAllReadResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark a single notification as read",
        description: "The notification must belong to the authenticated user.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Notification marked as read", ...jsonContent(ref("NotificationResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "404": { description: "Notification not found", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/settings/me": {
      get: {
        tags: ["Settings"],
        summary: "Get the authenticated user's profile",
        description: "Requires an authenticated CLIENT or AGENT.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Current profile", ...jsonContent(ref("SettingsProfileResponse")) },
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not a client or agent", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/settings/profile": {
      patch: {
        tags: ["Settings"],
        summary: "Update the authenticated user's name/phone",
        description: "Requires an authenticated CLIENT or AGENT. Email is not editable here.",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, ...jsonContent(ref("UpdateProfileRequest")) },
        responses: {
          "200": { description: "Profile updated", ...jsonContent(ref("SettingsProfileResponse")) },
          "400": responses.validation,
          "401": { description: "Missing, invalid, or expired token", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not a client or agent", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
    "/settings/change-password": {
      post: {
        tags: ["Settings"],
        summary: "Change the authenticated user's password",
        description:
          "Requires an authenticated CLIENT or AGENT and the current password. Also invalidates all previously-issued JWTs for the account (requireAuth rejects tokens issued before the change), same as /auth/reset-password.",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, ...jsonContent(ref("ChangePasswordRequest")) },
        responses: {
          "200": { description: "Password changed", ...jsonContent(ref("MessageResponse")) },
          "400": responses.validation,
          "401": { description: "Missing/invalid/expired token, or current password is incorrect", ...jsonContent(ref("ErrorResponse")) },
          "403": { description: "Authenticated user is not a client or agent", ...jsonContent(ref("ErrorResponse")) },
          "500": responses.serverError,
        },
      },
    },
  },
};
