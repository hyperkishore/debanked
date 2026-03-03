/**
 * FDIC BankFind API client.
 * Free government API — no API key required.
 * Docs: https://banks.data.fdic.gov/docs/
 * Dollar values returned in THOUSANDS from FDIC.
 */

const FDIC_API_BASE = "https://banks.data.fdic.gov/api";

const FDIC_FIELDS = [
  "NAME",
  "CERT",
  "ASSET",
  "DEP",
  "LNLSNET",
  "NETINC",
  "ROA",
  "ROE",
  "NIMY",
  "EEFFR",
  "CLASS",
  "CITY",
  "STNAME",
  "ACTIVE",
  "REPDTE",
].join(",");

export interface FdicBank {
  name: string;
  cert: number;
  totalAssets: number;
  totalDeposits: number;
  netLoans: number;
  netIncome: number;
  roa: number | null;
  roe: number | null;
  netInterestMargin: number | null;
  efficiencyRatio: number | null;
  charterClass: string;
  city: string;
  state: string;
  active: boolean;
  reportDate: string;
}

function parseBank(d: Record<string, unknown>): FdicBank {
  return {
    name: String(d.NAME || ""),
    cert: Number(d.CERT) || 0,
    totalAssets: (Number(d.ASSET) || 0) * 1000,
    totalDeposits: (Number(d.DEP) || 0) * 1000,
    netLoans: (Number(d.LNLSNET) || 0) * 1000,
    netIncome: (Number(d.NETINC) || 0) * 1000,
    roa: d.ROA != null ? Number(d.ROA) : null,
    roe: d.ROE != null ? Number(d.ROE) : null,
    netInterestMargin: d.NIMY != null ? Number(d.NIMY) : null,
    efficiencyRatio: d.EEFFR != null ? Number(d.EEFFR) : null,
    charterClass: String(d.CLASS || ""),
    city: String(d.CITY || ""),
    state: String(d.STNAME || ""),
    active: d.ACTIVE === 1 || d.ACTIVE === "1",
    reportDate: String(d.REPDTE || ""),
  };
}

/** Search FDIC institutions by name. Returns up to `limit` results sorted by assets descending. */
export async function searchBankByName(
  name: string,
  limit = 10
): Promise<FdicBank[]> {
  const encoded = encodeURIComponent(name);
  const url = `${FDIC_API_BASE}/financials?filters=REPDTE%3A${latestQuarter()}&search=INSNAME%3A${encoded}&fields=${FDIC_FIELDS}&limit=${limit}&sort_by=ASSET&sort_order=DESC`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`FDIC API error: ${res.status}`);
  const json = await res.json();
  const rows = json.data || [];
  return rows.map((r: { data: Record<string, unknown> }) => parseBank(r.data));
}

/** Get a specific bank by FDIC certificate number. */
export async function getBankByCert(cert: number): Promise<FdicBank | null> {
  const url = `${FDIC_API_BASE}/financials?filters=CERT%3A${cert}%20AND%20REPDTE%3A${latestQuarter()}&fields=${FDIC_FIELDS}&limit=1`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`FDIC API error: ${res.status}`);
  const json = await res.json();
  const rows = json.data || [];
  if (rows.length === 0) return null;
  return parseBank(rows[0].data);
}

/** Get the latest available quarter date string (YYYYMMDD). FDIC data lags ~3 months. */
function latestQuarter(): string {
  const now = new Date();
  // Go back 4 months to ensure data is available
  now.setMonth(now.getMonth() - 4);
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3);
  const quarterEndMonth = quarter * 3 + 3;
  const quarterEndDay = [31, 30, 30, 31][quarter];
  return `${year}${String(quarterEndMonth).padStart(2, "0")}${quarterEndDay}`;
}
