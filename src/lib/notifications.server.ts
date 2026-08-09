/** Server-only helpers for the notifications ledger. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Admin = typeof supabaseAdmin;

async function partiesForShare(admin: Admin, shareId: string): Promise<string[] | null> {
  const { data } = await admin
    .from("passport_shares")
    .select("tenant_id, property_listings!inner(landlord_id)")
    .eq("id", shareId)
    .maybeSingle();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landlordId = (data as any).property_listings?.landlord_id as string | undefined;
  return [data.tenant_id, landlordId].filter(Boolean) as string[];
}

/**
 * Returns the user ids permitted to exchange notifications about an entity,
 * or null when the entity does not exist.
 */
export async function resolveParties(
  admin: Admin,
  entityType: string,
  entityId: string,
): Promise<string[] | null> {
  switch (entityType) {
    case "passport_share":
      return partiesForShare(admin, entityId);

    case "tenancy_receipt": {
      const { data } = await admin
        .from("tenancy_receipts")
        .select("share_id")
        .eq("id", entityId)
        .maybeSingle();
      return data ? partiesForShare(admin, data.share_id) : null;
    }

    case "inventory_item": {
      const { data } = await admin
        .from("tenancy_inventory_items")
        .select("share_id")
        .eq("id", entityId)
        .maybeSingle();
      return data ? partiesForShare(admin, data.share_id) : null;
    }

    case "maintenance_ticket": {
      const { data } = await admin
        .from("maintenance_tickets")
        .select("tenant_id, property_listings!inner(landlord_id)")
        .eq("id", entityId)
        .maybeSingle();
      if (!data) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const landlordId = (data as any).property_listings?.landlord_id as string | undefined;
      return [data.tenant_id, landlordId].filter(Boolean) as string[];
    }

    case "property_listing": {
      const { data: listing } = await admin
        .from("property_listings")
        .select("landlord_id")
        .eq("id", entityId)
        .maybeSingle();
      if (!listing) return null;
      // The landlord plus every tenant who has applied to this listing.
      const { data: shares } = await admin
        .from("passport_shares")
        .select("tenant_id")
        .eq("listing_id", entityId);
      return [listing.landlord_id, ...(shares ?? []).map((s) => s.tenant_id)];
    }

    default:
      return null;
  }
}
