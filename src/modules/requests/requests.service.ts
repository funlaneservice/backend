import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { uploadBuffer } from "../uploads/uploads.service";
import { ApiError } from "../../utils/ApiError";
import { CreateRequestInput, ListMyRequestsQuery, QueueQuery } from "./requests.schema";

function toRequestView(request: {
  id: string;
  status: string;
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate: Date | null;
  budgetTier: string;
  preferredAirline: string | null;
  preferredTime: string | null;
  createdAt: Date;
  passengers: {
    id: string;
    fullName: string;
    passportNumber: string;
    passportExpiry: Date;
    nationality: string;
    dateOfBirth: Date;
  }[];
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
    createdAt: request.createdAt,
    passengers: request.passengers.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      passportNumber: p.passportNumber,
      passportExpiry: p.passportExpiry,
      nationality: p.nationality,
      dateOfBirth: p.dateOfBirth,
    })),
  };
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
    include: { passengers: true },
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
  const request = await prisma.travelRequest.findUnique({ where: { id }, include: { passengers: true } });

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
