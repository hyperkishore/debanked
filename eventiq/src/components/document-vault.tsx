"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FileText, Upload, Trash2, Download, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: number;
  company_id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  s3_key: string;
  notes: string;
  created_at: string;
}

interface DocumentVaultProps {
  companyId: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(fileType: string): string {
  if (fileType.includes("pdf")) return "PDF";
  if (fileType.includes("word") || fileType.includes("document")) return "DOC";
  if (fileType.includes("sheet") || fileType.includes("excel")) return "XLS";
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "PPT";
  if (fileType.includes("image")) return "IMG";
  return "FILE";
}

export function DocumentVault({ companyId }: DocumentVaultProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents?companyId=${companyId}`);
      if (!res.ok) return;
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (open && documents.length === 0) {
      fetchDocuments();
    }
  }, [open, documents.length, fetchDocuments]);

  const handleDelete = useCallback(async (docId: number) => {
    setDeleting(docId);
    try {
      const res = await fetch(`/api/documents?id=${docId}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        toast.success("Document deleted");
      } else {
        toast.error("Failed to delete document");
      }
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(null);
    }
  }, []);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border rounded-lg bg-card/50">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Documents</span>
              {documents.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {documents.length}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 border-t border-border/50 pt-2">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                        {getFileIcon(doc.file_type)}
                      </Badge>
                      <div className="min-w-0">
                        <div className="text-sm truncate">{doc.file_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size)} &middot;{" "}
                          {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          // S3 download URL would go here
                          toast.info("Download requires S3 configuration");
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        disabled={deleting === doc.id}
                        onClick={() => handleDelete(doc.id)}
                      >
                        {deleting === doc.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No documents yet. Upload proposals, contracts, or pitch decks.
              </p>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 h-8 text-xs gap-1"
              onClick={() => {
                toast.info("Document upload requires S3 configuration");
              }}
            >
              <Upload className="h-3 w-3" />
              Upload Document
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
