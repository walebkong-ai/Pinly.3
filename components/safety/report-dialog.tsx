"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reportCategoryOptions, type ReportCategoryValue } from "@/lib/reporting";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: string;
  title: string;
  description: string;
  successMessage: string;
  submitLabel?: string;
  onSuccess?: () => void;
};

const defaultCategory: ReportCategoryValue = reportCategoryOptions[0].value;

export function ReportDialog({
  open,
  onOpenChange,
  endpoint,
  title,
  description,
  successMessage,
  submitLabel = "Submit report",
  onSuccess
}: ReportDialogProps) {
  const [category, setCategory] = useState<ReportCategoryValue>(defaultCategory);
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) {
      setCategory(defaultCategory);
      setDetails("");
      setPending(false);
    }
  }, [open]);

  async function handleSubmit() {
    if (pending) {
      return;
    }

    setPending(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          category,
          details: details.trim() || undefined
        })
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not submit this report.");
      }

      toast.success(data?.duplicate ? "You already reported this." : successMessage);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit this report.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[2rem] border-none bg-[var(--surface-soft)] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-[var(--foreground)]/60">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--foreground)]/45">
            Reason
          </p>
          <div className="grid gap-2">
            {reportCategoryOptions.map((option) => {
              const selected = option.value === category;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCategory(option.value)}
                  className={`rounded-[1.3rem] border px-4 py-3 text-left transition ${
                    selected
                      ? "border-[var(--foreground)] bg-[var(--surface-strong)] shadow-sm"
                      : "border-[var(--surface-strong)] bg-[var(--surface-strong)]/60 hover:bg-[var(--surface-strong)]"
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">{option.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--foreground)]/56">{option.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-1">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--foreground)]/45">
            Details
          </p>
          <Textarea
            placeholder="Add anything that will help review this more quickly."
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            className="min-h-[110px] resize-none rounded-2xl border-[var(--surface-strong)] bg-[var(--surface-strong)]/50 focus-visible:ring-1 focus-visible:ring-[var(--foreground)]/20"
          />
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-full bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--foreground)]/90"
            onClick={() => void handleSubmit()}
            disabled={pending}
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
