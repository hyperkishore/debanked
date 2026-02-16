#!/usr/bin/env node
/**
 * Field mapping for EventIQ imports
 * Maps incoming column headers to EventIQ Company schema fields
 * Supports heuristic mapping (for in-app) and Claude API mapping (for CLI)
 */

// EventIQ Company schema fields with descriptions
const SCHEMA_FIELDS = {
  name: { label: 'Company Name', type: 'string', required: true },
  type: { label: 'Company Type', type: 'enum', values: ['SQO', 'Client', 'ICP', 'TAM'] },
  desc: { label: 'Description', type: 'string' },
  website: { label: 'Website URL', type: 'string' },
  linkedinUrl: { label: 'LinkedIn URL', type: 'string' },
  location: { label: 'Location', type: 'string' },
  employees: { label: 'Employee Count', type: 'number' },
  notes: { label: 'Internal Notes', type: 'string' },
  // Contact fields (flattened for CSV import)
  'contact_name': { label: 'Contact Name', type: 'string' },
  'contact_title': { label: 'Contact Title', type: 'string' },
  'contact_email': { label: 'Contact Email', type: 'string' },
  'contact_phone': { label: 'Contact Phone', type: 'string' },
  'contact_linkedin': { label: 'Contact LinkedIn', type: 'string' },
  // Engagement fields
  'last_activity': { label: 'Last Activity Date', type: 'date' },
  'deal_stage': { label: 'Deal Stage', type: 'string' },
  'deal_amount': { label: 'Deal Amount', type: 'number' },
  // Skip
  '_skip': { label: '(Skip this column)', type: 'skip' },
};

// Heuristic patterns: regex → schema field
const HEURISTIC_PATTERNS = [
  // Company name
  { pattern: /^(company|org|organization|account|business|firm)\s*(name)?$/i, field: 'name' },
  { pattern: /^name$/i, field: 'name' },

  // Type/category
  { pattern: /^(type|category|segment|tier|classification)$/i, field: 'type' },

  // Description
  { pattern: /^(desc|description|about|summary|overview|bio)$/i, field: 'desc' },

  // Website
  { pattern: /^(website|url|web|homepage|domain|site)$/i, field: 'website' },
  { pattern: /^company\s*url$/i, field: 'website' },

  // LinkedIn
  { pattern: /^(linkedin|linkedin\s*url|company\s*linkedin|linkedin\s*page)$/i, field: 'linkedinUrl' },

  // Location
  { pattern: /^(location|city|state|address|hq|headquarters|region|geography)$/i, field: 'location' },
  { pattern: /^(city\s*\/?\s*state|city.*state)$/i, field: 'location' },

  // Employees
  { pattern: /^(employees|employee\s*count|size|headcount|team\s*size|num\s*employees|# ?employees|number\s*of\s*employees)$/i, field: 'employees' },

  // Contact name
  { pattern: /^(contact|contact\s*name|first\s*name|full\s*name|person|lead|owner)$/i, field: 'contact_name' },
  { pattern: /^(first|firstname|first_name)$/i, field: 'contact_name' },

  // Contact title
  { pattern: /^(title|job\s*title|role|position|designation)$/i, field: 'contact_title' },

  // Contact email
  { pattern: /^(email|e-?mail|contact\s*email|email\s*address)$/i, field: 'contact_email' },

  // Contact phone
  { pattern: /^(phone|telephone|mobile|cell|phone\s*number)$/i, field: 'contact_phone' },

  // Contact LinkedIn
  { pattern: /^(contact\s*linkedin|person\s*linkedin|linkedin\s*profile)$/i, field: 'contact_linkedin' },

  // Notes
  { pattern: /^(notes|comments|remarks|memo|internal\s*notes)$/i, field: 'notes' },

  // Last activity
  { pattern: /^(last\s*activity|last\s*contact|last\s*engagement|last\s*touch|last\s*modified|updated)$/i, field: 'last_activity' },

  // Deal stage
  { pattern: /^(deal\s*stage|stage|pipeline|status|lifecycle|deal\s*status)$/i, field: 'deal_stage' },

  // Deal amount
  { pattern: /^(deal\s*amount|amount|value|deal\s*value|revenue|mrr|arr)$/i, field: 'deal_amount' },
];

/**
 * Map column headers to schema fields using heuristics
 * @param {string[]} headers - Column headers from CSV/JSON
 * @returns {Object<string, string>} Map of header → schema field (or '_skip')
 */
function heuristicMap(headers) {
  const mapping = {};
  const usedFields = new Set();

  for (const header of headers) {
    const cleaned = header.trim();
    let matched = false;

    for (const { pattern, field } of HEURISTIC_PATTERNS) {
      if (pattern.test(cleaned) && !usedFields.has(field)) {
        mapping[header] = field;
        usedFields.add(field);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Check if header contains key words
      const lower = cleaned.toLowerCase();
      if (!usedFields.has('name') && (lower.includes('company') || lower.includes('account'))) {
        mapping[header] = 'name';
        usedFields.add('name');
      } else if (!usedFields.has('contact_email') && lower.includes('email')) {
        mapping[header] = 'contact_email';
        usedFields.add('contact_email');
      } else if (!usedFields.has('contact_phone') && lower.includes('phone')) {
        mapping[header] = 'contact_phone';
        usedFields.add('contact_phone');
      } else {
        mapping[header] = '_skip';
      }
    }
  }

  return mapping;
}

/**
 * Build prompt for Claude API field mapping
 * @param {string[]} headers - Column headers
 * @param {object[]} sampleRows - 3 sample data rows
 * @returns {string} Prompt text
 */
function buildClaudePrompt(headers, sampleRows) {
  const schemaDesc = Object.entries(SCHEMA_FIELDS)
    .map(([key, info]) => `  "${key}": ${info.label} (${info.type})`)
    .join('\n');

  const sampleText = sampleRows.slice(0, 3).map((row, i) => {
    return `Row ${i + 1}: ${JSON.stringify(row)}`;
  }).join('\n');

  return `Map these CSV columns to the EventIQ company schema.

Available schema fields:
${schemaDesc}

CSV Headers: ${JSON.stringify(headers)}

Sample data:
${sampleText}

Respond with ONLY a JSON object mapping each header to the best matching schema field.
Use "_skip" for columns that don't map to any field.
Example: {"Company Name": "name", "Website": "website", "ID": "_skip"}`;
}

/**
 * Call Claude API for intelligent field mapping
 * @param {string[]} headers - Column headers
 * @param {object[]} sampleRows - Sample data rows
 * @returns {Promise<Object<string, string>>} Map of header → schema field
 */
async function claudeMap(headers, sampleRows) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set, falling back to heuristic mapping');
    return heuristicMap(headers);
  }

  const prompt = buildClaudePrompt(headers, sampleRows);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    }),
  });

  if (!response.ok) {
    console.warn(`Claude API error: ${response.status}, falling back to heuristic mapping`);
    return heuristicMap(headers);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  try {
    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const mapping = JSON.parse(jsonMatch[0]);
      // Validate all values are valid schema fields
      for (const [key, value] of Object.entries(mapping)) {
        if (!SCHEMA_FIELDS[value]) {
          mapping[key] = '_skip';
        }
      }
      return mapping;
    }
  } catch {
    // Fall through
  }

  console.warn('Could not parse Claude API response, falling back to heuristic mapping');
  return heuristicMap(headers);
}

/**
 * Convert mapped rows into EventIQ Company objects
 * @param {object[]} rows - Parsed data rows
 * @param {Object<string, string>} mapping - Header → schema field mapping
 * @param {number} startId - Starting ID for new companies
 * @returns {object[]} Array of Company-shaped objects
 */
function rowsToCompanies(rows, mapping, startId = 2000) {
  const companies = [];
  // Group by company name (multiple contacts per company)
  const companyMap = new Map();

  // Build reverse mapping: schema field → header
  const reverseMap = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (field !== '_skip') {
      reverseMap[field] = header;
    }
  }

  for (const row of rows) {
    const getValue = (field) => {
      const header = reverseMap[field];
      return header ? (row[header] || '').trim() : '';
    };

    const companyName = getValue('name');
    if (!companyName) continue;

    // Get or create company entry
    if (!companyMap.has(companyName)) {
      companyMap.set(companyName, {
        id: startId + companyMap.size,
        name: companyName,
        type: normalizeType(getValue('type')) || 'TAM',
        priority: 6,
        phase: 0,
        booth: false,
        contacts: [],
        desc: getValue('desc'),
        notes: getValue('notes'),
        news: [],
        ice: '',
        icebreakers: [],
        tp: [],
        leaders: [],
        ask: '',
        location: getValue('location'),
        employees: parseInt(getValue('employees')) || 0,
        website: normalizeWebsite(getValue('website')),
        linkedinUrl: getValue('linkedinUrl'),
        source: ['import'],
        _importMeta: {
          contactEmail: null,
          contactPhone: null,
          lastActivity: getValue('last_activity'),
          dealStage: getValue('deal_stage'),
          dealAmount: getValue('deal_amount'),
        },
      });
    }

    const company = companyMap.get(companyName);

    // Add contact if present
    const contactName = getValue('contact_name');
    if (contactName && !company.contacts.some(c => c.n === contactName)) {
      company.contacts.push({
        n: contactName,
        t: getValue('contact_title') || '',
      });

      // Also add as a leader stub
      if (!company.leaders.some(l => l.n === contactName)) {
        company.leaders.push({
          n: contactName,
          t: getValue('contact_title') || '',
          bg: '',
          li: getValue('contact_linkedin') || undefined,
        });
      }

      // Track email/phone in meta
      const email = getValue('contact_email');
      const phone = getValue('contact_phone');
      if (email) company._importMeta.contactEmail = email;
      if (phone) company._importMeta.contactPhone = phone;
    }

    // Merge notes if row has different notes
    const rowNotes = getValue('notes');
    if (rowNotes && company.notes && !company.notes.includes(rowNotes)) {
      company.notes = company.notes + '; ' + rowNotes;
    } else if (rowNotes && !company.notes) {
      company.notes = rowNotes;
    }
  }

  return Array.from(companyMap.values());
}

function normalizeType(type) {
  if (!type) return '';
  const upper = type.toUpperCase().trim();
  const map = {
    'SQO': 'SQO', 'SALES QUALIFIED': 'SQO',
    'CLIENT': 'Client', 'CUSTOMER': 'Client',
    'ICP': 'ICP', 'IDEAL': 'ICP', 'TARGET': 'ICP', 'PROSPECT': 'ICP',
    'TAM': 'TAM', 'MARKET': 'TAM', 'LEAD': 'TAM',
  };
  return map[upper] || '';
}

function normalizeWebsite(url) {
  if (!url || url === 'N/A' || url === 'n/a') return '';
  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  return clean;
}

/**
 * Get list of available schema fields for UI dropdowns
 */
function getSchemaFields() {
  return Object.entries(SCHEMA_FIELDS).map(([key, info]) => ({
    value: key,
    label: info.label,
    type: info.type,
  }));
}

module.exports = {
  SCHEMA_FIELDS,
  heuristicMap,
  claudeMap,
  buildClaudePrompt,
  rowsToCompanies,
  getSchemaFields,
};
