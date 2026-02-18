"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSheetsConfig, saveSheetsConfig, testConnection, flushQueue } from "@/lib/sheets-sync";
import { Settings2, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SheetsSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function SheetsSettings({ open, onClose }: SheetsSettingsProps) {
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [flushing, setFlushing] = useState(false);

  useEffect(() => {
    if (open) {
      const config = getSheetsConfig();
      setUrl(config.url);
      setEnabled(config.enabled);
      setTestResult(null);
    }
  }, [open]);

  const handleTest = async () => {
    if (!url.trim()) {
      toast.error("Enter a URL first");
      return;
    }
    setTesting(true);
    setTestResult(null);
    const ok = await testConnection(url.trim());
    setTestResult(ok);
    setTesting(false);
    if (ok) {
      toast.success("Connection OK — ping sent to sheet");
    } else {
      toast.error("Connection failed — check the URL");
    }
  };

  const handleSave = () => {
    saveSheetsConfig({ url: url.trim(), enabled });
    toast.success("Settings saved");
    onClose();
  };

  const handleFlush = async () => {
    setFlushing(true);
    const count = await flushQueue();
    setFlushing(false);
    if (count > 0) {
      toast.success(`Sent ${count} queued event${count > 1 ? "s" : ""}`);
    } else {
      toast.info("No queued events");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Google Sheets Sync
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Instructions */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 space-y-1">
            <p className="font-medium text-foreground">Setup:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Create a Google Sheet</li>
              <li>Go to Extensions → Apps Script</li>
              <li>Paste the script from <code className="text-[10px] bg-muted px-1 rounded">scripts/google-apps-script.gs</code></li>
              <li>Deploy → New Deployment → Web App (Anyone can access)</li>
              <li>Copy the URL and paste below</li>
            </ol>
          </div>

          {/* URL input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Apps Script Web App URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://script.google.com/macros/s/..."
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing || !url.trim()}
                className="h-9"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testResult === true ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : testResult === false ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  "Test"
                )}
              </Button>
            </div>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable sync</p>
              <p className="text-xs text-muted-foreground">
                Syncs feedback, engagements, pipeline, and met status
              </p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                enabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                  enabled ? "translate-x-5.5 left-[1px]" : "left-[2px]"
                }`}
                style={{ transform: enabled ? "translateX(21px)" : "translateX(0)" }}
              />
            </button>
          </div>

          {/* Flush queue */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <p className="text-sm font-medium">Retry queue</p>
              <p className="text-xs text-muted-foreground">Send any events that failed earlier</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleFlush} disabled={flushing}>
              {flushing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Flush
            </Button>
          </div>

          {/* What gets synced */}
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            <p className="font-medium text-foreground mb-1">What gets synced:</p>
            <ul className="space-y-0.5">
              <li>• Feedback submissions → Feedback sheet</li>
              <li>• Engagement logs → Engagements sheet</li>
              <li>• Pipeline stage changes → Pipeline sheet</li>
              <li>• Met/unmet toggles → Met Status sheet</li>
              <li>• Sequence step completions → Sequences sheet</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
