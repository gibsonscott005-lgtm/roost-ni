import { useState } from "react";
import { Check } from "lucide-react";
import {
  BILLS_OPTIONS,
  DESCRIPTION_MAX,
  DESCRIPTION_PROMPT,
  FEATURE_OPTIONS,
  FURNISHED_OPTIONS,
  GARDEN_OPTIONS,
  MIN_TENANCY_OPTIONS,
  PARKING_OPTIONS,
  PROPERTY_TYPES,
  type ListingDetailFields as ListingDetailRow,
  type ListingDetailInput,
} from "@/lib/listing-details";

export const emptyListingDetails: ListingDetailInput = {
  propertyType: "",
  bedrooms: "",
  bathrooms: "",
  furnished: "",
  availableFrom: "",
  minTenancy: "",
  description: "",
  bills: [],
  parking: "",
  garden: "",
  features: [],
};

export function listingDetailsFromRow(
  row: Partial<ListingDetailRow> | null | undefined,
): ListingDetailInput {
  if (!row) return emptyListingDetails;
  return {
    propertyType: row.property_type ?? "",
    bedrooms: row.bedrooms === null || row.bedrooms === undefined ? "" : String(row.bedrooms),
    bathrooms: row.bathrooms === null || row.bathrooms === undefined ? "" : String(row.bathrooms),
    furnished: row.furnished ?? "",
    availableFrom: row.available_from ?? "",
    minTenancy:
      row.min_tenancy_months === null || row.min_tenancy_months === undefined
        ? ""
        : String(row.min_tenancy_months),
    description: row.description ?? "",
    bills: row.bills_included ?? [],
    parking: row.parking ?? "",
    garden: row.garden ?? "",
    features: row.features ?? [],
  };
}

export function useListingDetails(initial?: ListingDetailInput) {
  const [value, setValue] = useState<ListingDetailInput>(initial ?? emptyListingDetails);
  return { value, setValue };
}

const inputCx =
  "mt-1.5 block h-11 w-full rounded-xl border border-border bg-surface-muted px-3.5 text-sm text-foreground placeholder:text-muted-foreground/80 transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
        active
          ? "border-verified bg-verified text-[var(--color-verified-foreground)]"
          : "border-border bg-surface hover:bg-secondary"
      }`}
    >
      {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      {children}
    </button>
  );
}

function PillGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <Pill key={o} active={selected === o} onClick={() => onSelect(selected === o ? "" : o)}>
            {o}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function MultiPillGroup({
  label,
  options,
  selected,
  onToggle,
  emptyHint,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
  emptyHint?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <Pill key={o} active={selected.includes(o)} onClick={() => onToggle(o)}>
            {o}
          </Pill>
        ))}
      </div>
      {emptyHint && selected.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{emptyHint}</p>
      ) : null}
    </div>
  );
}

export function PropertyBasicsFields({
  value,
  onChange,
}: {
  value: ListingDetailInput;
  onChange: (v: ListingDetailInput) => void;
}) {
  const set = <K extends keyof ListingDetailInput>(k: K, v: ListingDetailInput[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-5">
      <PillGroup
        label="Property type"
        options={PROPERTY_TYPES}
        selected={value.propertyType}
        onSelect={(v) => set("propertyType", v)}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <Label>Bedrooms</Label>
          <input
            inputMode="numeric"
            value={value.bedrooms}
            onChange={(e) => set("bedrooms", e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
            placeholder="2"
            className={inputCx}
          />
          <span className="mt-1.5 block text-xs text-muted-foreground">
            Enter 0 for a studio.
          </span>
        </label>
        <label className="block">
          <Label>Bathrooms</Label>
          <input
            inputMode="numeric"
            value={value.bathrooms}
            onChange={(e) => set("bathrooms", e.target.value.replace(/[^0-9]/g, "").slice(0, 1))}
            placeholder="1"
            className={inputCx}
          />
        </label>
      </div>
      <PillGroup
        label="Furnished status"
        options={FURNISHED_OPTIONS}
        selected={value.furnished}
        onSelect={(v) => set("furnished", v)}
      />
    </div>
  );
}

export function AvailabilityFields({
  value,
  onChange,
}: {
  value: ListingDetailInput;
  onChange: (v: ListingDetailInput) => void;
}) {
  const set = <K extends keyof ListingDetailInput>(k: K, v: ListingDetailInput[K]) =>
    onChange({ ...value, [k]: v });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <label className="block sm:max-w-xs">
        <Label>Available from</Label>
        <input
          type="date"
          min={today}
          value={value.availableFrom}
          onChange={(e) => set("availableFrom", e.target.value)}
          className={inputCx}
        />
      </label>
      <div>
        <Label>Minimum tenancy</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {MIN_TENANCY_OPTIONS.map((o) => {
            const v = o.months === null ? "" : String(o.months);
            const active = value.minTenancy === v && (o.months !== null || value.minTenancy === "");
            return (
              <Pill key={o.label} active={active} onClick={() => set("minTenancy", v)}>
                {o.label}
              </Pill>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DescriptionField({
  value,
  onChange,
}: {
  value: ListingDetailInput;
  onChange: (v: ListingDetailInput) => void;
}) {
  return (
    <label className="block">
      <Label>Property description</Label>
      <textarea
        rows={6}
        maxLength={DESCRIPTION_MAX}
        value={value.description}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        placeholder={DESCRIPTION_PROMPT}
        className="mt-1.5 block w-full rounded-xl border border-border bg-surface-muted px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/80 transition focus:border-verified/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-verified/20"
      />
      <span className="mt-1.5 block text-xs text-muted-foreground">
        {value.description.length} / {DESCRIPTION_MAX} characters
      </span>
    </label>
  );
}

export function FeaturesFields({
  value,
  onChange,
}: {
  value: ListingDetailInput;
  onChange: (v: ListingDetailInput) => void;
}) {
  const set = <K extends keyof ListingDetailInput>(k: K, v: ListingDetailInput[K]) =>
    onChange({ ...value, [k]: v });
  const toggle = (key: "bills" | "features", label: string) =>
    set(
      key,
      value[key].includes(label)
        ? value[key].filter((x) => x !== label)
        : [...value[key], label],
    );

  return (
    <div className="space-y-5">
      <MultiPillGroup
        label="Bills included in the rent"
        options={BILLS_OPTIONS}
        selected={value.bills}
        onToggle={(l) => toggle("bills", l)}
        emptyHint="Nothing selected — the listing will show no bills included."
      />
      <PillGroup
        label="Parking"
        options={PARKING_OPTIONS}
        selected={value.parking}
        onSelect={(v) => set("parking", v)}
      />
      <PillGroup
        label="Garden / outside space"
        options={GARDEN_OPTIONS}
        selected={value.garden}
        onSelect={(v) => set("garden", v)}
      />
      <MultiPillGroup
        label="Extras"
        options={FEATURE_OPTIONS}
        selected={value.features}
        onToggle={(l) => toggle("features", l)}
      />
    </div>
  );
}