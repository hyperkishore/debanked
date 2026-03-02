import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";
import { readFile, stat } from "fs/promises";
import path from "path";

/**
 * Document registry — whitelist approach for security.
 * Adding a new document = one entry here. Frontend auto-discovers from listing.
 */
const DOCS: Record<string, { title: string; description: string; file: string }> = {
  roadmap: {
    title: "Product Roadmap",
    description: "Vision, phases, and execution plan",
    file: "ROADMAP.md",
  },
  improvements: {
    title: "Improvement Plan",
    description: "Priorities, implementation guidance",
    file: "improvements.md",
  },
  bugs: {
    title: "Bug Register",
    description: "Known bugs with severity and fix options",
    file: "bugs.md",
  },
  "ai-crm-research": {
    title: "AI CRM & Sales Platforms",
    description: "Competitive intelligence on AI tools",
    file: "AI-CRM-SALES-PLATFORMS-RESEARCH.md",
  },
  "pipeline-research": {
    title: "Pipeline Revenue Model",
    description: "Pipeline math and revenue modeling",
    file: "PIPELINE-REVENUE-RESEARCH.md",
  },
  "gtm-research": {
    title: "GTM Gap Analysis",
    description: "Second-round GTM strategy research",
    file: "GTM-ROUND2-RESEARCH.md",
  },
  competitive: {
    title: "Competitive Analysis",
    description: "Competitor landscape analysis",
    file: "competitive-analysis.md",
  },
};

/** Resolve document path safely — files live in the parent directory of eventiq/ */
function resolveDocPath(filename: string): string {
  const baseDir = path.resolve(process.cwd(), "..");
  const resolved = path.resolve(baseDir, filename);
  // Validate the resolved path stays under the allowed base
  if (!resolved.startsWith(baseDir)) {
    throw new Error("Path traversal blocked");
  }
  return resolved;
}

/**
 * GET /api/research-docs
 *   - No query params → returns document listing
 *   - ?doc=<slug>    → returns document content
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;

  const docSlug = request.nextUrl.searchParams.get("doc");

  // Listing mode — return all document metadata
  if (!docSlug) {
    const documents = Object.entries(DOCS).map(([slug, meta]) => ({
      slug,
      title: meta.title,
      description: meta.description,
    }));
    return NextResponse.json({ documents });
  }

  // Single document mode
  const docMeta = DOCS[docSlug];
  if (!docMeta) {
    return apiError(`Unknown document: ${docSlug}`, 404);
  }

  try {
    const filePath = resolveDocPath(docMeta.file);
    const [content, fileStat] = await Promise.all([
      readFile(filePath, "utf-8"),
      stat(filePath),
    ]);

    return NextResponse.json({
      slug: docSlug,
      title: docMeta.title,
      content,
      lastModified: fileStat.mtime.toISOString(),
    });
  } catch (err) {
    console.error(`[research-docs] Failed to read ${docMeta.file}:`, err);
    return apiError(`Document not found: ${docMeta.title}`, 404);
  }
}
