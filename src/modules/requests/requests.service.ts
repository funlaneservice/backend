import { randomUUID } from "crypto";
import { Prisma, RequestStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import * as notificationsService from "../notifications/notifications.service";
import { getSignedDownloadUrl, uploadBuffer } from "../uploads/uploads.service";
import * as walletService from "../wallet/wallet.service";
import { ApiError } from "../../utils/ApiError";
import {
  AdminForceStatusInput,
  AdminListRequestsQuery,
  ApproveRequestInput,
  CancelRequestInput,
  CreateRequestInput,
  ListMyRequestsQuery,
  QueueQuery,
  QuoteOptionInput,
  RejectRequestInput,
} from "./requests.schema";

const OPTIONS_EDITABLE_STATUSES: RequestStatus[] = ["PENDING", "OPTIONS_SENT"];

function toQuoteOptionView(option: {
  id: string;
  label: string;
  airline: string;
  price: number;
  departureTime: Date;
  details: string | null;
  createdAt: Date;
}) {
  return {
    id: option.id,
    label: option.label,
    airline: option.airline,
    price: option.price,
    departureTime: option.departureTime,
    details: option.details,
    createdAt: option.createdAt,
  };
}

async function toRequestView(request: {
  id: string;
  status: string;
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate: Date | null;
  budgetTier: string;
  preferredAirline: string | null;
  preferredTime: string | null;
  assignedAgentId: string | null;
  rejectionReason: string | null;
  ticketPdfKey: string | null;
  issuedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  payoutStatus: string;
  createdAt: Date;
  passengers: {
    id: string;
    fullName: string;
    passportNumber: string;
    passportExpiry: Date;
    nationality: string;
    dateOfBirth: Date;
  }[];
  quoteOptions: {
    id: string;
    label: string;
    airline: string;
    price: number;
    departureTime: Date;
    details: string | null;
    createdAt: Date;
  }[];
}) {
  let ticketDownloadUrl: string | null = null;
  if (request.ticketPdfKey) {
    try {
      ticketDownloadUrl = await getSignedDownloadUrl(request.ticketPdfKey);
    } catch (err) {
      console.error("[requests] failed to generate ticket download URL:", err);
    }
  }

  return {
    id: request.id,
    status: request.status,
    origin: request.origin,
    destination: request.destination,
    departureDate: request.departureDate,
    returnDate: request.returnDate,
    budgetTier: request.budgetTier,
    preferredAirline: request.preferredAirline,
    preferredTime: request.preferredTime,
    assignedAgentId: request.assignedAgentId,
    rejectionReason: request.rejectionReason,
    issuedAt: request.issuedAt,
    completedAt: request.completedAt,
    cancelledAt: request.cancelledAt,
    cancellationReason: request.cancellationReason,
    payoutStatus: request.payoutStatus,
    ticketDownloadUrl,
    createdAt: request.createdAt,
    passengers: request.passengers.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      passportNumber: p.passportNumber,
      passportExpiry: p.passportExpiry,
      nationality: p.nationality,
      dateOfBirth: p.dateOfBirth,
    })),
    quoteOptions: request.quoteOptions.map(toQuoteOptionView),
  };
}

async function getAssignedRequestOrThrow(
  agentId: string,
  requestId: string,
  allowedStatuses: RequestStatus[]
) {
  const request = await prisma.travelRequest.findUnique({ where: { id: requestId } });

  if (!request) {
    throw new ApiError(404, "Request not found");
  }
  if (request.assignedAgentId !== agentId) {
    throw new ApiError(403, "You are not assigned to this request");
  }
  if (!allowedStatuses.includes(request.status)) {
    throw new ApiError(409, `Cannot do this while the request is ${request.status}`);
  }

  return request;
}

function toRequestSummaryView(request: {
  id: string;
  status: string;
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate: Date | null;
  budgetTier: string;
  preferredAirline: string | null;
  preferredTime: string | null;
  assignedAgentId: string | null;
  createdAt: Date;
  _count: { passengers: number };
}) {
  return {
    id: request.id,
    status: request.status,
    origin: request.origin,
    destination: request.destination,
    departureDate: request.departureDate,
    returnDate: request.returnDate,
    budgetTier: request.budgetTier,
    preferredAirline: request.preferredAirline,
    preferredTime: request.preferredTime,
    assignedAgentId: request.assignedAgentId,
    passengerCount: request._count.passengers,
    createdAt: request.createdAt,
  };
}

function paginate(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function createRequest(
  clientId: string,
  input: CreateRequestInput,
  files: Express.Multer.File[]
) {
  if (files.length !== input.passengers.length) {
    throw new ApiError(
      400,
      `Expected ${input.passengers.length} passport document(s), received ${files.length}`
    );
  }

  const passengersData = await Promise.all(
    input.passengers.map(async (passenger, index) => {
      const file = files[index];
      const passportDocKey = await uploadBuffer(`passports/${randomUUID()}`, file.buffer, file.mimetype);
      return {
        fullName: passenger.fullName,
        passportNumber: passenger.passportNumber,
        passportExpiry: passenger.passportExpiry,
        nationality: passenger.nationality,
        dateOfBirth: passenger.dateOfBirth,
        passportDocKey,
      };
    })
  );

  const request = await prisma.travelRequest.create({
    data: {
      clientId,
      origin: input.origin,
      destination: input.destination,
      departureDate: input.departureDate,
      returnDate: input.returnDate,
      budgetTier: input.budgetTier,
      preferredAirline: input.preferredAirline,
      preferredTime: input.preferredTime,
      passengers: { create: passengersData },
    },
    include: { passengers: true, quoteOptions: true },
  });

  return toRequestView(request);
}

export async function listMyRequests(clientId: string, query: ListMyRequestsQuery) {
  const where: Prisma.TravelRequestWhereInput = {
    clientId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.travelRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { _count: { select: { passengers: true } } },
    }),
    prisma.travelRequest.count({ where }),
  ]);

  return {
    requests: requests.map(toRequestSummaryView),
    pagination: paginate(total, query.page, query.limit),
  };
}

export async function adminListRequests(query: AdminListRequestsQuery) {
  const where: Prisma.TravelRequestWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.assignedAgentId ? { assignedAgentId: query.assignedAgentId } : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.travelRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { _count: { select: { passengers: true } } },
    }),
    prisma.travelRequest.count({ where }),
  ]);

  return {
    requests: requests.map(toRequestSummaryView),
    pagination: paginate(total, query.page, query.limit),
  };
}

export async function getQueue(agentId: string, query: QueueQuery) {
  const where: Prisma.TravelRequestWhereInput = query.mine
    ? { assignedAgentId: agentId, ...(query.status ? { status: query.status } : {}) }
    : { assignedAgentId: null, status: query.status ?? "PENDING" };

  const [requests, total] = await Promise.all([
    prisma.travelRequest.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { _count: { select: { passengers: true } } },
    }),
    prisma.travelRequest.count({ where }),
  ]);

  return {
    requests: requests.map(toRequestSummaryView),
    pagination: paginate(total, query.page, query.limit),
  };
}

export async function getRequestById(viewer: { userId: string; role: string }, id: string) {
  const request = await prisma.travelRequest.findUnique({
    where: { id },
    include: { passengers: true, quoteOptions: true },
  });

  if (!request || (viewer.role === "CLIENT" && request.clientId !== viewer.userId)) {
    throw new ApiError(404, "Request not found");
  }

  return toRequestView(request);
}

export async function claimRequest(agentId: string, id: string) {
  const claimed = await prisma.travelRequest.updateMany({
    where: { id, assignedAgentId: null, status: "PENDING" },
    data: { assignedAgentId: agentId },
  });

  if (claimed.count === 0) {
    const existing = await prisma.travelRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Request not found");
    }
    throw new ApiError(409, "This request has already been claimed");
  }

  return getRequestById({ userId: agentId, role: "AGENT" }, id);
}

export async function addQuoteOption(agentId: string, requestId: string, input: QuoteOptionInput) {
  await getAssignedRequestOrThrow(agentId, requestId, OPTIONS_EDITABLE_STATUSES);

  const option = await prisma.quoteOption.create({
    data: {
      requestId,
      label: input.label,
      airline: input.airline,
      price: input.price,
      departureTime: input.departureTime,
      details: input.details,
    },
  });

  return toQuoteOptionView(option);
}

export async function deleteQuoteOption(agentId: string, requestId: string, optionId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM travel_requests WHERE id = ${requestId} FOR UPDATE`;

    const request = await tx.travelRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new ApiError(404, "Request not found");
    }
    if (request.assignedAgentId !== agentId) {
      throw new ApiError(403, "You are not assigned to this request");
    }
    if (!OPTIONS_EDITABLE_STATUSES.includes(request.status)) {
      throw new ApiError(409, `Cannot do this while the request is ${request.status}`);
    }
    if (request.approvedOptionId === optionId) {
      throw new ApiError(409, "This option has already been approved and cannot be deleted");
    }

    const option = await tx.quoteOption.findUnique({ where: { id: optionId } });
    if (!option || option.requestId !== requestId) {
      throw new ApiError(404, "Quote option not found");
    }

    try {
      await tx.quoteOption.delete({ where: { id: optionId } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ApiError(409, "This option has already been approved and cannot be deleted");
      }
      throw err;
    }
  });
}

export async function sendOptions(agentId: string, requestId: string) {
  await getAssignedRequestOrThrow(agentId, requestId, ["PENDING"]);

  const optionCount = await prisma.quoteOption.count({ where: { requestId } });
  if (optionCount === 0) {
    throw new ApiError(400, "Add at least one quote option before sending");
  }

  const updated = await prisma.travelRequest.update({
    where: { id: requestId },
    data: { status: "OPTIONS_SENT" },
    include: { passengers: true, quoteOptions: true },
  });

  void notificationsService.notifyOptionsSent(requestId, updated.clientId);

  return toRequestView(updated);
}

export async function approveOption(clientId: string, requestId: string, input: ApproveRequestInput) {
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM travel_requests WHERE id = ${requestId} FOR UPDATE`;

    const request = await tx.travelRequest.findUnique({ where: { id: requestId } });
    if (!request || request.clientId !== clientId) {
      throw new ApiError(404, "Request not found");
    }
    if (request.status !== "OPTIONS_SENT") {
      throw new ApiError(409, `Cannot approve while the request is ${request.status}`);
    }

    const option = await tx.quoteOption.findUnique({ where: { id: input.optionId } });
    if (!option || option.requestId !== requestId) {
      throw new ApiError(404, "Quote option not found");
    }

    await walletService.lockFunds(tx, clientId, option.price, requestId);

    return tx.travelRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED_LOCKED", approvedOptionId: input.optionId, approvedAt: new Date() },
      include: { passengers: true, quoteOptions: true },
    });
  });

  if (updated.assignedAgentId) {
    void notificationsService.notifyRequestApproved(requestId, updated.assignedAgentId);
  }

  return toRequestView(updated);
}

export async function cancelRequest(clientId: string, requestId: string, input: CancelRequestInput) {
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM travel_requests WHERE id = ${requestId} FOR UPDATE`;

    const request = await tx.travelRequest.findUnique({ where: { id: requestId } });
    if (!request || request.clientId !== clientId) {
      throw new ApiError(404, "Request not found");
    }
    if (request.status !== "APPROVED_LOCKED") {
      throw new ApiError(409, `Cannot cancel while the request is ${request.status}`);
    }
    if (!request.approvedOptionId) {
      throw new Error("APPROVED_LOCKED request is missing its approved option");
    }

    const option = await tx.quoteOption.findUniqueOrThrow({ where: { id: request.approvedOptionId } });

    await walletService.releaseFunds(tx, clientId, option.price, requestId);

    return tx.travelRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: input.reason },
      include: { passengers: true, quoteOptions: true },
    });
  });

  return toRequestView(updated);
}

export async function adminCancelRequest(adminId: string, requestId: string, input: CancelRequestInput) {
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM travel_requests WHERE id = ${requestId} FOR UPDATE`;

    const request = await tx.travelRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new ApiError(404, "Request not found");
    }
    if (request.status === "COMPLETED" || request.status === "CANCELLED") {
      throw new ApiError(409, `Cannot cancel a request that is already ${request.status}`);
    }
    if (request.status === "ISSUED") {
      throw new ApiError(409, "Cannot cancel a request with an issued ticket");
    }

    if (request.status === "APPROVED_LOCKED") {
      if (!request.approvedOptionId) {
        throw new Error("APPROVED_LOCKED request is missing its approved option");
      }
      const option = await tx.quoteOption.findUniqueOrThrow({ where: { id: request.approvedOptionId } });
      await walletService.releaseFunds(tx, request.clientId, option.price, requestId);
    }

    return tx.travelRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: input.reason },
      include: { passengers: true, quoteOptions: true },
    });
  });

  console.warn(`[requests] admin ${adminId} force-cancelled request ${requestId}: ${input.reason}`);

  return toRequestView(updated);
}

export async function adminReassignAgent(adminId: string, requestId: string, agentId: string | null) {
  const request = await prisma.travelRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    throw new ApiError(404, "Request not found");
  }
  if (request.status === "COMPLETED" || request.status === "CANCELLED") {
    throw new ApiError(409, `Cannot reassign a request that is already ${request.status}`);
  }

  if (agentId) {
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || agent.role !== "AGENT") {
      throw new ApiError(400, "agentId must belong to an existing agent");
    }
    if (agent.status !== "ACTIVE") {
      throw new ApiError(400, "Cannot assign to a non-active agent");
    }
  }

  const updated = await prisma.travelRequest.update({
    where: { id: requestId },
    data: { assignedAgentId: agentId },
    include: { passengers: true, quoteOptions: true },
  });

  console.warn(`[requests] admin ${adminId} reassigned request ${requestId} to agent ${agentId ?? "(unassigned)"}`);

  return toRequestView(updated);
}

// Bypasses the normal state machine entirely — it does not lock, release, or capture
// wallet funds, since a forced jump can cross those transitions in either direction.
// The admin is responsible for reconciling wallet state via the wallet admin views if
// the forced status crosses an APPROVED_LOCKED/COMPLETED boundary.
export async function adminForceStatus(adminId: string, requestId: string, input: AdminForceStatusInput) {
  const request = await prisma.travelRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    throw new ApiError(404, "Request not found");
  }
  if (request.status === input.status) {
    throw new ApiError(409, `Request is already ${input.status}`);
  }

  const updated = await prisma.travelRequest.update({
    where: { id: requestId },
    data: { status: input.status },
    include: { passengers: true, quoteOptions: true },
  });

  console.warn(
    `[requests] admin ${adminId} force-set request ${requestId} status ${request.status} -> ${input.status}${
      input.reason ? `: ${input.reason}` : ""
    }`
  );

  return toRequestView(updated);
}

export async function issueTicket(agentId: string, requestId: string, file: Express.Multer.File) {
  await getAssignedRequestOrThrow(agentId, requestId, ["APPROVED_LOCKED"]);

  const ticketPdfKey = await uploadBuffer(`tickets/${randomUUID()}`, file.buffer, file.mimetype);

  const updated = await prisma.travelRequest.update({
    where: { id: requestId },
    data: { status: "ISSUED", ticketPdfKey, issuedAt: new Date() },
    include: { passengers: true, quoteOptions: true },
  });

  void notificationsService.notifyTicketCompleted(requestId, updated.clientId);

  return toRequestView(updated);
}

export async function completeRequest(agentId: string, requestId: string) {
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM travel_requests WHERE id = ${requestId} FOR UPDATE`;

    const request = await tx.travelRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new ApiError(404, "Request not found");
    }
    if (request.assignedAgentId !== agentId) {
      throw new ApiError(403, "You are not assigned to this request");
    }
    if (request.status !== "ISSUED") {
      throw new ApiError(409, `Cannot complete while the request is ${request.status}`);
    }
    if (!request.approvedOptionId) {
      throw new Error("ISSUED request is missing its approved option");
    }

    const option = await tx.quoteOption.findUniqueOrThrow({ where: { id: request.approvedOptionId } });

    await walletService.captureFunds(tx, request.clientId, option.price, requestId);

    return tx.travelRequest.update({
      where: { id: requestId },
      data: { status: "COMPLETED", completedAt: new Date(), payoutStatus: "PENDING" },
      include: { passengers: true, quoteOptions: true },
    });
  });

  return toRequestView(updated);
}

export async function rejectOptions(clientId: string, requestId: string, input: RejectRequestInput) {
  const request = await prisma.travelRequest.findUnique({ where: { id: requestId } });

  if (!request || request.clientId !== clientId) {
    throw new ApiError(404, "Request not found");
  }
  if (request.status !== "OPTIONS_SENT") {
    throw new ApiError(409, `Cannot reject while the request is ${request.status}`);
  }

  const updated = await prisma.travelRequest.update({
    where: { id: requestId },
    data: { status: "PENDING", rejectionReason: input.reason, rejectedAt: new Date() },
    include: { passengers: true, quoteOptions: true },
  });

  if (updated.assignedAgentId) {
    void notificationsService.notifyRequestRejected(requestId, updated.assignedAgentId, input.reason);
  }

  return toRequestView(updated);
}
