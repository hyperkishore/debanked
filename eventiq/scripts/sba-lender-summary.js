#!/usr/bin/env node
/**
 * SBA 7(a) Lender Summary ETL Script
 *
 * Downloads SBA 7(a) loan data from data.sba.gov, aggregates by lender,
 * and outputs a summary JSON file for the /api/tools/sba endpoint.
 *
 * Usage: node scripts/sba-lender-summary.js
 * Run quarterly to refresh data.
 *
 * Output: src/data/sba-lenders.json
 */

import { createWriteStream } from "fs";
import { writeFile } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { tmpdir } from "os";
import { join } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const SBA_CSV_URL =
  "https://data.sba.gov/dataset/0ff8e8e9-b967-4f4e-987c-6ac78c575087/resource/d67d3ccb-2002-4134-a288-481b51cd3479/download/foia-7a-fy2020-present-as-of-251231.csv";

const OUTPUT_PATH = join(
  import.meta.dirname,
  "..",
  "src",
  "data",
  "sba-lenders.json"
);

async function main() {
  console.log("Downloading SBA 7(a) data...");
  const tmpPath = join(tmpdir(), "sba-7a-data.csv");

  // Download CSV to temp file (streaming to avoid memory issues)
  const res = await fetch(SBA_CSV_URL);
  if (!res.ok) {
    console.error(`Failed to download SBA data: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const fileStream = createWriteStream(tmpPath);
  await pipeline(Readable.fromWeb(res.body), fileStream);
  console.log(`Downloaded to ${tmpPath}`);

  // Stream-parse CSV and aggregate by lender
  const lenders = new Map();
  let lineCount = 0;
  let headerMap = null;

  const rl = createInterface({
    input: createReadStream(tmpPath, "utf-8"),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineCount++;

    if (lineCount === 1) {
      // Parse header row
      const headers = parseCSVLine(line);
      headerMap = {};
      headers.forEach((h, i) => {
        headerMap[h.toLowerCase().trim()] = i;
      });

      // Verify required columns exist
      const required = ["bankname", "grossapproval", "approvalfiscalyear"];
      for (const col of required) {
        if (!(col in headerMap)) {
          console.error(`Missing required column: ${col}`);
          console.error("Available columns:", Object.keys(headerMap).join(", "));
          process.exit(1);
        }
      }
      continue;
    }

    const fields = parseCSVLine(line);
    const bankName = fields[headerMap["bankname"]]?.trim();
    const grossApproval = parseFloat(
      (fields[headerMap["grossapproval"]] || "0").replace(/[,$]/g, "")
    );
    const fiscalYear = parseInt(
      fields[headerMap["approvalfiscalyear"]] || "0",
      10
    );

    if (!bankName) continue;

    const existing = lenders.get(bankName) || {
      lenderName: bankName,
      totalLoans: 0,
      totalVolume: 0,
      latestFiscalYear: 0,
    };

    existing.totalLoans += 1;
    existing.totalVolume += grossApproval;
    if (fiscalYear > existing.latestFiscalYear) {
      existing.latestFiscalYear = fiscalYear;
    }

    lenders.set(bankName, existing);
  }

  console.log(`Parsed ${lineCount - 1} loan records from ${lenders.size} lenders`);

  // Convert to array, compute avg loan size, sort by volume
  const result = Array.from(lenders.values())
    .map((l) => ({
      lenderName: l.lenderName,
      totalLoans: l.totalLoans,
      totalVolume: Math.round(l.totalVolume),
      avgLoanSize: Math.round(l.totalVolume / l.totalLoans),
      latestFiscalYear: l.latestFiscalYear,
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume);

  await writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`Wrote ${result.length} lenders to ${OUTPUT_PATH}`);
  console.log(`Top 5 by volume:`);
  result.slice(0, 5).forEach((l, i) => {
    console.log(
      `  ${i + 1}. ${l.lenderName}: $${(l.totalVolume / 1e9).toFixed(1)}B (${l.totalLoans} loans)`
    );
  });
}

/** Parse a single CSV line respecting quoted fields. */
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
