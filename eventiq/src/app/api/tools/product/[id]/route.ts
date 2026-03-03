import { NextResponse, type NextRequest } from "next/server";
import { validateToolKey } from "@/lib/tool-auth";
import { getProductDocById } from "@/data/product-docs";

/**
 * GET /api/tools/product/[id]
 * Returns the full ProductDoc for a single product.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateToolKey(request)) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const { id } = await params;
  const product = getProductDocById(id);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}
