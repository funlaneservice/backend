import { env } from "../config/env";

const DUFFEL_BASE_URL = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

const isConfigured = Boolean(env.duffelApiKey);

if (!isConfigured) {
  console.warn(
    "[duffel] DUFFEL_API_KEY not configured — flight search will fail until it is set."
  );
}

export function isDuffelConfigured(): boolean {
  return isConfigured;
}

interface DuffelResponse<T> {
  data: T;
}

interface DuffelErrorBody {
  errors?: { title?: string; detail?: string; code?: string }[];
}

async function duffelRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!env.duffelApiKey) {
    throw new Error("Duffel is not configured");
  }

  const res = await fetch(`${DUFFEL_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.duffelApiKey}`,
      "Duffel-Version": DUFFEL_VERSION,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as DuffelErrorBody;
    const detail = body.errors?.map((e) => e.detail ?? e.title).join("; ") || res.statusText;
    throw new Error(`Duffel request to ${path} failed: ${detail}`);
  }

  const body = (await res.json()) as DuffelResponse<T>;
  return body.data;
}

export type DuffelCabinClass = "economy" | "premium_economy" | "business" | "first";

export interface SearchOffersParams {
  originIata: string;
  destinationIata: string;
  departureDate: Date;
  returnDate?: Date;
  cabinClass: DuffelCabinClass;
  passengerCount: number;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  expires_at: string;
  owner: { name: string; iata_code: string };
  slices: {
    duration: string | null;
    segments: {
      departing_at: string;
      arriving_at: string;
      origin: { iata_code: string };
      destination: { iata_code: string };
      marketing_carrier: { name: string };
    }[];
  }[];
}

export async function searchOffers(params: SearchOffersParams): Promise<DuffelOffer[]> {
  const slices = [
    {
      origin: params.originIata,
      destination: params.destinationIata,
      departure_date: toDateOnly(params.departureDate),
    },
  ];

  if (params.returnDate) {
    slices.push({
      origin: params.destinationIata,
      destination: params.originIata,
      departure_date: toDateOnly(params.returnDate),
    });
  }

  const offerRequest = await duffelRequest<{ offers?: DuffelOffer[] }>(
    "/air/offer_requests?return_offers=true",
    {
      method: "POST",
      body: JSON.stringify({
        data: {
          slices,
          passengers: Array.from({ length: params.passengerCount }, () => ({ type: "adult" })),
          cabin_class: params.cabinClass,
        },
      }),
    }
  );

  return offerRequest.offers ?? [];
}

export async function getOffer(offerId: string): Promise<DuffelOffer> {
  return duffelRequest<DuffelOffer>(`/air/offers/${encodeURIComponent(offerId)}`, {
    method: "GET",
  });
}

interface PlaceSuggestion {
  iata_code: string | null;
  type: string;
}

const placeIataCache = new Map<string, string | null>();

export async function suggestPlaceIataCode(query: string): Promise<string | null> {
  const cacheKey = query.trim().toLowerCase();
  if (placeIataCache.has(cacheKey)) {
    return placeIataCache.get(cacheKey) ?? null;
  }

  const suggestions = await duffelRequest<PlaceSuggestion[]>(
    `/places/suggestions?query=${encodeURIComponent(query)}`,
    { method: "GET" }
  );

  const airport = suggestions.find((s) => s.type === "airport" && s.iata_code);
  const iataCode = airport?.iata_code ?? suggestions.find((s) => s.iata_code)?.iata_code ?? null;

  placeIataCache.set(cacheKey, iataCode);
  return iataCode;
}
