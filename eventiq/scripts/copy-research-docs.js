#!/usr/bin/env node
/**
 * Copies research markdown files from the parent directory into .research-docs/
 * so they're available to the API route in both local dev and Vercel production.
 *
 * Runs as a prebuild step (see package.json).
 * The .research-docs/ directory is gitignored — these are build artifacts.
 */
const fs = require("fs");
const path = require("path");

const DOCS = [
  "ROADMAP.md",
  "improvements.md",
  "bugs.md",
  "AI-CRM-SALES-PLATFORMS-RESEARCH.md",
  "PIPELINE-REVENUE-RESEARCH.md",
  "GTM-ROUND2-RESEARCH.md",
  "competitive-analysis.md",
];

const parentDir = path.resolve(__dirname, "../..");
const outDir = path.resolve(__dirname, "../.research-docs");

// Create output directory
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let copied = 0;
let skipped = 0;

for (const file of DOCS) {
  const src = path.join(parentDir, file);
  const dest = path.join(outDir, file);

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    copied++;
  } else {
    console.warn(`  [copy-research-docs] Skipping ${file} (not found)`);
    skipped++;
  }
}

console.log(`  [copy-research-docs] Copied ${copied} docs${skipped ? `, skipped ${skipped}` : ""} → .research-docs/`);
