// Dependency-free legal source URL validation.
// Keep this module free of imports: it is used inside server function handlers
// where pulling in the HTML reader (cheerio/undici) breaks the published bundle.
const LEGAL_SOURCE_HOSTS = new Set([
  "www.nidirect.gov.uk",
  "www.communities-ni.gov.uk",
  "www.legislation.gov.uk",
  "www.housingrights.org.uk",
  "www.tdsnorthernireland.com",
  "www.mydepositsni.co.uk",
]);

export function validateLegalSourceUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || !LEGAL_SOURCE_HOSTS.has(url.hostname) || url.username || url.password || url.port) {
    throw new Error("Use a recognised NI legal source URL.");
  }
  return url.toString();
}
