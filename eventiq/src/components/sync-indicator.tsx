"use client";

import { useState, useEffect } from "react";
import { getSyncStatus, onSyncStatusChange, SyncStatus, queueSize } from "@/lib/sync-queue";
import { useAuth } from "@/contexts/auth-context";
import { Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";

const statusConfig: Record<SyncStatus, { icon: typeof Cloud; color: string; label: string }> = {
  idle: { icon: Cloud, color: "text-green-400", label: "Synced" },
  syncing: { icon: Loader2, color: "text-yellow-400", label: "Syncing..." },
  pending: { icon: CloudOff, color: "text-yellow-500", label: "Pending" },
  error: { icon: AlertCircle, color: "text-red-400", label: "Sync error" },
};

export function SyncIndicator() {
  const { user, isConfigured } = useAuth();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [pending, setPending] = useState(queueSize());

  useEffect(() => {
    const unsub = onSyncStatusChange((s) => {
      setStatus(s);
      setPending(queueSize());
    });
    return unsub;
  }, []);

  // Don't show anything if Supabase isn't configured or user not logged in
  if (!isConfigured || !user) return null;

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-1 ${config.color}`}
      title={`${config.label}${pending > 0 ? ` (${pending} pending)` : ""}`}
    >
      <Icon className={`h-3.5 w-3.5 ${status === "syncing" ? "animate-spin" : ""}`} />
    </div>
  );
}
