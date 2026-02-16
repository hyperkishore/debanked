#!/usr/bin/env node
/**
 * Lightweight CSV parser for EventIQ imports
 * Handles: quoted fields, commas in values, newlines in quotes, BOM, various line endings
 */

/**
 * Parse a CSV string into an array of objects (header row → keys)
 * @param {string} text - Raw CSV text
 * @param {object} opts - Options
 * @param {string} opts.delimiter - Column delimiter (default: auto-detect , or \t)
 * @returns {{ headers: string[], rows: object[], rawRows: string[][] }}
 */
function parseCSV(text, opts = {}) {
  // Strip BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Auto-detect delimiter
  const delimiter = opts.delimiter || detectDelimiter(text);

  const rawRows = parseRows(text, delimiter);
  if (rawRows.length === 0) return { headers: [], rows: [], rawRows: [] };

  // First row is headers
  const headers = rawRows[0].map(h => h.trim());
  const rows = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    // Skip empty rows
    if (row.length === 1 && row[0].trim() === '') continue;

    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (row[j] || '').trim();
    }
    rows.push(obj);
  }

  return { headers, rows, rawRows };
}

/**
 * Detect delimiter by counting occurrences in first line
 */
function detectDelimiter(text) {
  const firstLine = text.split('\n')[0];
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const pipes = (firstLine.match(/\|/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;

  const max = Math.max(commas, tabs, pipes, semis);
  if (max === 0) return ',';
  if (max === tabs) return '\t';
  if (max === pipes) return '|';
  if (max === semis) return ';';
  return ',';
}

/**
 * Parse CSV text into raw 2D array, respecting quoted fields
 */
function parseRows(text, delimiter) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        currentField += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (ch === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
      } else {
        currentField += ch;
        i++;
      }
    }
  }

  // Last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parse a JSON string (array of objects or single object)
 * @param {string} text - Raw JSON text
 * @returns {{ headers: string[], rows: object[] }}
 */
function parseJSON(text) {
  const data = JSON.parse(text.trim());
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) return { headers: [], rows: [] };

  // Collect all unique keys across all objects
  const headerSet = new Set();
  for (const obj of arr) {
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        headerSet.add(key);
      }
    }
  }

  const headers = Array.from(headerSet);
  const rows = arr.filter(obj => obj && typeof obj === 'object');

  return { headers, rows };
}

/**
 * Auto-detect format and parse
 * @param {string} text - Raw text (CSV, TSV, or JSON)
 * @returns {{ headers: string[], rows: object[], format: string }}
 */
function autoParse(text) {
  const trimmed = text.trim();

  // Try JSON first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const result = parseJSON(trimmed);
      return { ...result, format: 'json' };
    } catch {
      // Fall through to CSV
    }
  }

  // Parse as CSV
  const result = parseCSV(trimmed);
  return { ...result, format: 'csv' };
}

module.exports = {
  parseCSV,
  parseJSON,
  autoParse,
  detectDelimiter,
};
