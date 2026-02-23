import { NextResponse, type NextRequest } from "next/server";
import {
  authenticateRequest,
  requireInt,
  apiError,
} from "@/lib/api-helpers";

/**
 * GET /api/documents?companyId=123
 * List documents for a company (scoped to the user's own uploads).
 *
 * POST /api/documents
 * Upload document metadata (file upload to S3 handled client-side with presigned URL).
 * Body: { companyId, fileName, fileSize, fileType, s3Key }
 *
 * DELETE /api/documents?id=456
 * Delete a document record (only the uploader can delete).
 */

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const companyIdParam = request.nextUrl.searchParams.get("companyId");
  const parsed = requireInt(companyIdParam, "companyId");
  if ("error" in parsed) return parsed.error;

  const { data: documents, error } = await supabase
    .from("company_documents")
    .select("*")
    .eq("company_id", parsed.value)
    .eq("uploaded_by", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json({ documents: documents || [] });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json();
  const { companyId, fileName, fileSize, fileType, s3Key } = body;

  if (!companyId || !fileName || !s3Key) {
    return apiError("companyId, fileName, and s3Key required", 400);
  }

  const parsedCompanyId = requireInt(String(companyId), "companyId");
  if ("error" in parsedCompanyId) return parsedCompanyId.error;

  const { data, error } = await supabase
    .from("company_documents")
    .insert({
      company_id: parsedCompanyId.value,
      uploaded_by: user.id,
      file_name: fileName,
      file_size: fileSize || 0,
      file_type: fileType || "application/octet-stream",
      s3_key: s3Key,
    })
    .select()
    .single();

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json({ document: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const docIdParam = request.nextUrl.searchParams.get("id");
  const parsed = requireInt(docIdParam, "id");
  if ("error" in parsed) return parsed.error;

  const { error } = await supabase
    .from("company_documents")
    .delete()
    .eq("id", parsed.value)
    .eq("uploaded_by", user.id);

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json({ success: true });
}
