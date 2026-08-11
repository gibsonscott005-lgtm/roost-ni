/** Shared printable tenancy documents (lease copy + statutory NI notice). */

/** Escape a value for safe interpolation into printable HTML. */
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

import {
  NI_LEGAL_DISCLAIMER,
  formatDate,
  type DeductionLine,
  type NoticeParty,
} from "@/lib/tenancy-end";

const BASE_STYLE = `
  body{font:14px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;max-width:760px;margin:32px auto;padding:0 24px}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#64748b;margin-top:24px}
  .clause{margin:14px 0} .clause h3{font-size:15px;margin:0 0 4px}
  .sig{display:flex;gap:24px;margin-top:36px;border-top:1px solid #e2e8f0;padding-top:18px}
  .sig div{flex:1} .muted{color:#64748b;font-size:12px}
  table{border-collapse:collapse;width:100%;margin-top:8px}
  td,th{border:1px solid #e2e8f0;padding:8px 10px;text-align:left;font-size:13px;vertical-align:top}
  th{background:#f8fafc;width:38%;font-weight:600}
`;

/** Opens a new window with printable HTML. Returns false when pop-ups are blocked. */
export function openPrintable(html: string) {
  const w = window.open("", "_blank", "noopener,width=900,height=1100");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
  return true;
}

export interface LeaseDocOptions {
  tenantName: string;
  landlordName: string;
  address: string;
  rent: number;
  deposit: number;
  tenantSignature: string;
  tenantSignedAt: string | null;
  oilClause: boolean;
  counterSigned?: boolean;
}

export function leaseDocumentHtml(opts: LeaseDocOptions) {
  const {
    tenantName,
    landlordName,
    address,
    rent,
    deposit,
    tenantSignature,
    tenantSignedAt,
    oilClause,
    counterSigned = true,
  } = opts;
  const signedAt = tenantSignedAt
    ? new Date(tenantSignedAt).toLocaleString("en-GB")
    : new Date().toLocaleString("en-GB");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Roost NI Tenancy Agreement — ${esc(address)}</title>
    <style>${BASE_STYLE}</style></head><body>
    <h1>Private Residential Tenancy Agreement</h1>
    <p class="muted">Made under the Private Tenancies Act (Northern Ireland) 2022</p>
    <p>Between <strong>${esc(landlordName)}</strong> ("Landlord") and <strong>${esc(tenantName)}</strong> ("Tenant") in respect of the property at <strong>${esc(address)}</strong>.</p>
    <h2>Clauses</h2>
    <div class="clause"><h3>1. Rent</h3><p>£${rent.toLocaleString()} per calendar month, payable in advance on the 1st of each month.</p></div>
    <div class="clause"><h3>2. Deposit &amp; Protection</h3><p>£${deposit.toLocaleString()} lodged with an approved NI scheme within 28 days of receipt.</p></div>
    <div class="clause"><h3>3. Term</h3><p>12 months initial term, thereafter rolling monthly subject to statutory notice.</p></div>
    <div class="clause"><h3>4. Property Condition</h3><p>Property provided in clean, safe condition with required certificates supplied on or before commencement.</p></div>
    ${oilClause ? `<div class="clause"><h3>5. Domestic Oil Tank — Full In / Full Out</h3><p>The oil tank shall be supplied <em>full</em> at commencement and returned <em>full</em> at end of tenancy, or reimbursed at prevailing rates.</p></div>` : ""}
    <div class="clause"><h3>${oilClause ? "6" : "5"}. Repairs &amp; Maintenance</h3><p>Landlord responsible for structural repairs and supply installations as required by statute.</p></div>
    <div class="sig">
      <div><strong>Tenant</strong><br>${esc(tenantSignature)}<br><span class="muted">Signed electronically ${esc(signedAt)}</span></div>
      <div><strong>Landlord</strong><br>${esc(landlordName)}<br><span class="muted">${counterSigned ? "Counter-signed via Roost" : "Awaiting counter-signature"}</span></div>
    </div>
    </body></html>`;
}

export interface NoticeDocOptions {
  tenantName: string;
  landlordName: string;
  landlordEmail?: string | null;
  landlordPhone?: string | null;
  address: string;
  rent: number;
  deposit: number;
  depositScheme?: string | null;
  depositCertNumber?: string | null;
  depositProtectedAt?: string | null;
  tenancyStart?: string | null;
  heatingType?: string | null;
  landlordRegNumber?: string | null;
  oilClause?: boolean;
}

/**
 * Tenancy Information Notice required under the Private Tenancies Act (NI) 2022,
 * section 1 — must be given to the tenant within 28 days of the tenancy starting.
 */
export function tenancyInfoNoticeHtml(opts: NoticeDocOptions) {
  const gb = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "To be confirmed");
  const val = (v?: string | null) => (v && String(v).trim() ? v : "Not yet supplied");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Tenancy Information Notice — ${esc(opts.address)}</title>
    <style>${BASE_STYLE}</style></head><body>
    <h1>Tenancy Information Notice</h1>
    <p class="muted">Issued under Section 1 of the Private Tenancies Act (Northern Ireland) 2022. The landlord must give this notice to the tenant within 28 days of the start of the tenancy.</p>

    <h2>1. The parties</h2>
    <table>
      <tr><th>Tenant</th><td>${esc(opts.tenantName)}</td></tr>
      <tr><th>Landlord</th><td>${esc(opts.landlordName)}</td></tr>
      <tr><th>Landlord contact address / email</th><td>${esc(val(opts.landlordEmail))}</td></tr>
      <tr><th>Landlord contact telephone</th><td>${esc(val(opts.landlordPhone))}</td></tr>
      <tr><th>NI Landlord Registration Number</th><td>${esc(val(opts.landlordRegNumber))}</td></tr>
    </table>

    <h2>2. The tenancy</h2>
    <table>
      <tr><th>Property</th><td>${esc(opts.address)}</td></tr>
      <tr><th>Date the tenancy began</th><td>${esc(gb(opts.tenancyStart))}</td></tr>
      <tr><th>Rent payable</th><td>£${Number(opts.rent).toLocaleString()} per calendar month, in advance on the 1st of each month</td></tr>
      <tr><th>How rent is paid</th><td>Standing order or bank transfer to the landlord. Receipts are issued through Roost for every payment.</td></tr>
      <tr><th>Rates</th><td>Where the rent is inclusive of rates this is stated in the tenancy agreement; otherwise the tenant is responsible.</td></tr>
    </table>

    <h2>3. Deposit</h2>
    <table>
      <tr><th>Deposit paid</th><td>£${Number(opts.deposit).toLocaleString()}</td></tr>
      <tr><th>Approved scheme</th><td>${esc(val(opts.depositScheme))}</td></tr>
      <tr><th>Scheme certificate number</th><td>${esc(val(opts.depositCertNumber))}</td></tr>
      <tr><th>Date protected</th><td>${esc(gb(opts.depositProtectedAt))}</td></tr>
    </table>
    <p class="muted">A tenancy deposit must be protected in an approved scheme within 28 days of being received, and the prescribed information given to the tenant within 35 days.</p>

    <h2>4. Repairs and safety</h2>
    <table>
      <tr><th>Heating type</th><td>${esc(val(opts.heatingType))}</td></tr>
      <tr><th>Fuel policy</th><td>${opts.oilClause ? "Fair Fuel — oil tank supplied full at commencement and returned full at the end of the tenancy." : "Standard — no oil tank clause applies."}</td></tr>
      <tr><th>Reporting repairs</th><td>Report all repairs through the Roost maintenance workspace so both parties keep a timestamped record.</td></tr>
      <tr><th>Landlord repair duties</th><td>Structure and exterior, and the installations for the supply of water, gas, electricity, sanitation, space heating and heating water.</td></tr>
      <tr><th>Certificates</th><td>Electrical (EICR), gas safety where applicable, and an Energy Performance Certificate are supplied to the tenant on or before commencement.</td></tr>
    </table>

    <h2>5. Ending the tenancy</h2>
    <p>Notice to quit periods are set by the Private Tenancies Act (Northern Ireland) 2022 and depend on how long the tenancy has run. Neither party may end the tenancy with less notice than the statute requires.</p>

    <div class="sig">
      <div><strong>Issued by</strong><br>${esc(opts.landlordName)}<br><span class="muted">via Roost · ${new Date().toLocaleDateString("en-GB")}</span></div>
      <div><strong>Received by</strong><br>${esc(opts.tenantName)}<br><span class="muted">Acknowledged on signing the tenancy agreement</span></div>
    </div>
    <p class="muted">This notice is generated from the tenancy record held in Roost. It is provided for convenience and does not constitute legal advice.</p>
    </body></html>`;
}
export interface NoticeToQuitOptions {
  servedBy: NoticeParty;
  landlordName: string;
  tenantName: string;
  address: string;
  landlordRegNumber?: string | null;
  tenancyStart?: string | null;
  servedOn: string;
  noticeWeeks: number;
  endDate: string;
  reason?: string | null;
}

/**
 * Notice to Quit under the Private Tenancies Act (Northern Ireland) 2022.
 * Must be in writing, dated, identify the property and state the date the
 * tenancy ends.
 */
export function noticeToQuitHtml(o: NoticeToQuitOptions) {
  const fromParty = o.servedBy === "landlord" ? o.landlordName : o.tenantName;
  const toParty = o.servedBy === "landlord" ? o.tenantName : o.landlordName;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Notice to Quit — ${esc(o.address)}</title>
    <style>${BASE_STYLE}</style></head><body>
    <h1>Notice to Quit</h1>
    <p class="muted">Served under the Private Tenancies Act (Northern Ireland) 2022</p>
    <table>
      <tr><th>From (${esc(o.servedBy === "landlord" ? "Landlord" : "Tenant")})</th><td>${esc(fromParty)}</td></tr>
      <tr><th>To (${esc(o.servedBy === "landlord" ? "Tenant" : "Landlord")})</th><td>${esc(toParty)}</td></tr>
      <tr><th>Property</th><td>${esc(o.address)}</td></tr>
      ${o.landlordRegNumber ? `<tr><th>Landlord registration</th><td>${esc(o.landlordRegNumber)}</td></tr>` : ""}
      <tr><th>Tenancy began</th><td>${esc(formatDate(o.tenancyStart ?? null))}</td></tr>
      <tr><th>Date of this notice</th><td>${esc(formatDate(o.servedOn))}</td></tr>
      <tr><th>Notice period</th><td>${esc(o.noticeWeeks)} weeks</td></tr>
      <tr><th>Tenancy ends on</th><td><strong>${esc(formatDate(o.endDate))}</strong></td></tr>
    </table>
    <div class="clause"><h3>Notice</h3><p>Take notice that the tenancy of the above property will end on <strong>${esc(formatDate(o.endDate))}</strong>. Vacant possession is required on or before that date.</p></div>
    ${o.reason ? `<div class="clause"><h3>Reason given</h3><p>${esc(o.reason)}</p></div>` : ""}
    <div class="clause"><h3>Deposit</h3><p>Any tenancy deposit must be returned, or proposed deductions agreed, within 28 days of the tenancy ending. Disputes may be referred to the approved scheme protecting the deposit.</p></div>
    <div class="sig">
      <div><strong>Served by</strong><br>${esc(fromParty)}<br><span class="muted">Issued via Roost on ${esc(formatDate(o.servedOn))}</span></div>
      <div><strong>Received by</strong><br>${esc(toParty)}<br><span class="muted">Acknowledgement recorded in Roost</span></div>
    </div>
    <p class="muted" style="margin-top:24px">${esc(NI_LEGAL_DISCLAIMER)}</p>
    </body></html>`;
}

export interface SettlementDocOptions {
  landlordName: string;
  tenantName: string;
  address: string;
  depositTotal: number;
  deductions: DeductionLine[];
  proposedReturn: number;
  tenantResponse?: string | null;
  tenantComment?: string | null;
  schemeDisputeRef?: string | null;
  depositScheme?: string | null;
  endDate?: string | null;
  returnedAt?: string | null;
  returnMethod?: string | null;
}

/** Itemised deposit settlement statement issued at the end of a tenancy. */
export function depositSettlementHtml(o: SettlementDocOptions) {
  const rows = o.deductions.length
    ? o.deductions
        .map(
          (d) =>
            `<tr><th style="width:70%">${esc(d.reason)}</th><td>£${Number(d.amount || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`,
        )
        .join("")
    : `<tr><th style="width:70%">No deductions proposed</th><td>£0.00</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Deposit Settlement — ${esc(o.address)}</title>
    <style>${BASE_STYLE}</style></head><body>
    <h1>Deposit Settlement Statement</h1>
    <p class="muted">End of tenancy at ${esc(o.address)}</p>
    <table>
      <tr><th>Landlord</th><td>${esc(o.landlordName)}</td></tr>
      <tr><th>Tenant</th><td>${esc(o.tenantName)}</td></tr>
      <tr><th>Tenancy ended</th><td>${esc(formatDate(o.endDate ?? null))}</td></tr>
      <tr><th>Deposit held</th><td>£${Number(o.depositTotal || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
      ${o.depositScheme ? `<tr><th>Protection scheme</th><td>${esc(o.depositScheme)}</td></tr>` : ""}
    </table>
    <h2>Proposed deductions</h2>
    <table>${rows}</table>
    <h2>Amount to return</h2>
    <table><tr><th style="width:70%">Returning to tenant</th><td><strong>£${Number(o.proposedReturn || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td></tr>
    ${o.returnedAt ? `<tr><th>Returned on</th><td>${esc(formatDate(o.returnedAt))}${o.returnMethod ? ` — ${esc(o.returnMethod)}` : ""}</td></tr>` : ""}</table>
    ${
      o.tenantResponse
        ? `<div class="clause"><h3>Tenant response</h3><p>${esc(o.tenantResponse === "agreed" ? "Agreed" : "Disputed")}${o.tenantComment ? ` — ${esc(o.tenantComment)}` : ""}</p>${o.schemeDisputeRef ? `<p class="muted">Scheme dispute reference: ${esc(o.schemeDisputeRef)}</p>` : ""}</div>`
        : ""
    }
    <p class="muted" style="margin-top:24px">Deposits must be returned, or deductions agreed, within 28 days of the tenancy ending. Where agreement cannot be reached, the approved scheme holding the deposit provides a free dispute resolution service. ${esc(NI_LEGAL_DISCLAIMER)}</p>
    </body></html>`;
}
