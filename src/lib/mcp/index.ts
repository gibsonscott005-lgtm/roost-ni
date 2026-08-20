import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchListings from "./tools/search-listings";
import getListing from "./tools/get-listing";
import myListings from "./tools/my-listings";
import myApplications from "./tools/my-applications";
import maintenanceTickets from "./tools/maintenance-tickets";
import myNotifications from "./tools/my-notifications";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "northern-ireland-rental-hub",
  title: "Northern Ireland Rental Hub",
  version: "0.1.0",
  instructions:
    "Tools for Roost, a Northern Ireland direct rental platform. Search published listings, read listing detail, and — as the signed-in user — review their own properties, passport applications and tenancies, maintenance tickets and notifications. All data is scoped to the signed-in account.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchListings,
    getListing,
    myListings,
    myApplications,
    maintenanceTickets,
    myNotifications,
  ],
});
