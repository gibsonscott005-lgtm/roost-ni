export const PROPERTY_TYPES = [
  "House",
  "Apartment / Flat",
  "Bungalow",
  "Terrace",
  "Semi-detached",
  "Detached",
  "Room in shared house",
] as const;

/* ------------------------------------------------------------------ */
/* Heating & Fair Fuel                                                 */
/* ------------------------------------------------------------------ */

export const HEATING_OPTIONS = ["Oil", "LPG", "Gas", "Electric"] as const;
export type HeatingOption = (typeof HEATING_OPTIONS)[number];

/** Bulk-tank fuels where the Fair Fuel same-level policy applies. */
export function usesFuelTank(heatingType: string | null | undefined) {
  const v = (heatingType ?? "").trim().toLowerCase();
  return v === "oil" || v === "lpg";
}

/** Plain-English name of the fuel, e.g. "heating oil" or "LPG". */
export function fuelLabel(heatingType: string | null | undefined) {
  const v = (heatingType ?? "").trim().toLowerCase();
  if (v === "lpg") return "LPG";
  if (v === "oil") return "heating oil";
  return "fuel";
}

/** Tank heading, e.g. "Heating oil tank" or "LPG tank". */
export function fuelTankLabel(heatingType: string | null | undefined) {
  const v = (heatingType ?? "").trim().toLowerCase();
  if (v === "lpg") return "LPG tank";
  if (v === "oil") return "Heating oil tank";
  return "Fuel tank";
}

export const FAIR_FUEL_TITLE = "Fair Fuel — same level out";

export const FAIR_FUEL_POLICY =
  "The tank is returned at the level recorded at handover. Full in, full out. If it was empty at handover, empty is acceptable at the end.";

/** One-sentence policy statement naming the fuel. */
export function fairFuelSentence(heatingType: string | null | undefined) {
  return `Fair Fuel: the ${fuelLabel(heatingType)} tank is returned at the level recorded at handover — full in, full out; empty in, empty out.`;
}

export const FUEL_LEVELS = [
  { value: "full", label: "Full", pct: 1 },
  { value: "three_quarter", label: "3/4", pct: 0.75 },
  { value: "half", label: "1/2", pct: 0.5 },
  { value: "quarter", label: "1/4", pct: 0.25 },
  { value: "empty", label: "Empty", pct: 0 },
] as const;

export type FuelLevel = (typeof FUEL_LEVELS)[number]["value"];

export function fuelLevelPct(value: string | null | undefined) {
  return FUEL_LEVELS.find((l) => l.value === value)?.pct ?? null;
}

export function fuelLevelLabel(value: string | null | undefined) {
  return FUEL_LEVELS.find((l) => l.value === value)?.label ?? null;
}

export type FuelComparison = "unknown" | "met" | "below" | "above";

/** Compares a move-out level against the handover baseline. States facts, never a verdict. */
export function compareFuelLevels(
  handover: string | null | undefined,
  final: string | null | undefined,
): { status: FuelComparison; message: string } {
  const a = fuelLevelPct(handover);
  const b = fuelLevelPct(final);
  if (a === null || b === null)
    return {
      status: "unknown",
      message: "Record both the handover level and the move-out level to compare them.",
    };
  if (b < a)
    return {
      status: "below",
      message: `Returned below the handover level (${fuelLevelLabel(handover)} in, ${fuelLevelLabel(final)} out).`,
    };
  if (b > a)
    return {
      status: "above",
      message: `Returned above the handover level (${fuelLevelLabel(handover)} in, ${fuelLevelLabel(final)} out).`,
    };
  return {
    status: "met",
    message:
      a === 0
        ? "Tank was empty at handover and empty at move-out — this meets the policy."
        : `Returned at the handover level (${fuelLevelLabel(handover)}) — this meets the policy.`,
  };
}

export const FURNISHED_OPTIONS = ["Furnished", "Part-furnished", "Unfurnished"] as const;

export const MIN_TENANCY_OPTIONS: { label: string; months: number | null }[] = [
  { label: "6 months", months: 6 },
  { label: "12 months", months: 12 },
  { label: "Flexible", months: null },
];

export const BILLS_OPTIONS = [
  "Broadband",
  "Water",
  "Electricity",
  "Heating oil / gas",
  "Bins",
] as const;

export const PARKING_OPTIONS = [
  "None",
  "On-street",
  "Driveway",
  "Allocated space",
  "Garage",
] as const;

export const GARDEN_OPTIONS = ["None", "Shared", "Private yard", "Private garden"] as const;

export const FEATURE_OPTIONS = [
  "Washing machine",
  "Dishwasher",
  "Wheelchair accessible",
  "Double glazing",
  "Alarm",
] as const;

export const DESCRIPTION_MAX = 2000;
export const DESCRIPTION_PROMPT =
  "Describe the layout, condition, the area and transport links. Keep it factual — this is what tenants read first.";

export interface ListingDetailFields {
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnished: string | null;
  available_from: string | null;
  min_tenancy_months: number | null;
  description: string | null;
  bills_included: string[] | null;
  parking: string | null;
  garden: string | null;
  features: string[] | null;
}

export const LISTING_DETAIL_COLUMNS =
  "property_type, bedrooms, bathrooms, furnished, available_from, min_tenancy_months, description, bills_included, parking, garden, features";

export function minTenancyLabel(months: number | null | undefined) {
  if (months === null || months === undefined) return "Flexible";
  return `${months} months`;
}

export function formatAvailableFrom(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d <= today) return "Available now";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function bedroomLabel(bedrooms: number | null | undefined) {
  if (bedrooms === null || bedrooms === undefined) return null;
  if (bedrooms === 0) return "Studio";
  return `${bedrooms} bed`;
}

export interface ListingDetailInput {
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  furnished: string;
  availableFrom: string;
  minTenancy: string;
  description: string;
  bills: string[];
  parking: string;
  garden: string;
  features: string[];
}

/** Returns an error message, or null when the detail fields are valid. */
export function validateListingDetails(v: ListingDetailInput): string | null {
  if (!v.propertyType) return "Choose a property type.";
  if (!v.furnished) return "Choose a furnished status.";
  const beds = Number(v.bedrooms);
  if (v.bedrooms === "" || !Number.isInteger(beds) || beds < 0 || beds > 10)
    return "Bedrooms must be a whole number between 0 and 10.";
  const baths = Number(v.bathrooms);
  if (v.bathrooms !== "" && (!Number.isInteger(baths) || baths < 1 || baths > 5))
    return "Bathrooms must be a whole number between 1 and 5.";
  if (v.description.length > DESCRIPTION_MAX)
    return `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  if (v.availableFrom) {
    const d = new Date(`${v.availableFrom}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(d.getTime())) return "Enter a valid available-from date.";
    if (d < today) return "Available from cannot be in the past.";
  }
  return null;
}

export function listingDetailPayload(v: ListingDetailInput) {
  return {
    property_type: v.propertyType || null,
    bedrooms: v.bedrooms === "" ? null : Number(v.bedrooms),
    bathrooms: v.bathrooms === "" ? null : Number(v.bathrooms),
    furnished: v.furnished || null,
    available_from: v.availableFrom || null,
    min_tenancy_months: v.minTenancy === "" ? null : Number(v.minTenancy),
    description: v.description.trim() || null,
    bills_included: v.bills,
    parking: v.parking || null,
    garden: v.garden || null,
    features: v.features,
  };
}