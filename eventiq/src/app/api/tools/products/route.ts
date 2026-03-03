import { NextResponse, type NextRequest } from "next/server";
import { validateToolKey } from "@/lib/tool-auth";
import { PRODUCT_DOCS } from "@/data/product-docs";

/**
 * GET /api/tools/products
 * Returns a summary of all 8 products for the AI agent.
 */
export async function GET(request: NextRequest) {
  if (!validateToolKey(request)) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const products = PRODUCT_DOCS.map((doc) => ({
    id: doc.id,
    name: doc.name,
    tagline: doc.tagline,
    keyFeatures: doc.keyFeatures,
    metrics: doc.metrics,
    demoCount: doc.demoVideos.length + (doc.liveDemoUrl ? 1 : 0),
    collateralCount: doc.collateral.length,
  }));

  return NextResponse.json({ products });
}
