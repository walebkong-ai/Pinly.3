"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

export function SettingsForm() {
  const [showLikeCounts, setShowLikeCounts] = useState(true);
  const [showCommentCounts, setShowCommentCounts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setShowLikeCounts(data.showLikeCounts);
          setShowCommentCounts(data.showCommentCounts);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    void load();
  }, []);

  async function save(updates: { showLikeCounts?: boolean; showCommentCounts?: boolean }) {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        setShowLikeCounts(data.showLikeCounts);
        setShowCommentCounts(data.showCommentCounts);
        toast.success("Settings saved");
      }
    } catch {
      toast.error("Could not save settings");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoaderCircle className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Like counts toggle */}
      <label className="flex items-center justify-between rounded-2xl border bg-white/70 p-4">
        <div>
          <p className="text-sm font-medium">Show like counts</p>
          <p className="mt-0.5 text-xs text-[var(--foreground)]/55">Display the number of likes on posts</p>
        </div>
        <input
          type="checkbox"
          checked={showLikeCounts}
          onChange={(e) => {
            setShowLikeCounts(e.target.checked);
            void save({ showLikeCounts: e.target.checked });
          }}
          className="h-5 w-5 rounded accent-[var(--accent)]"
        />
      </label>

      {/* Comment counts toggle */}
      <label className="flex items-center justify-between rounded-2xl border bg-white/70 p-4">
        <div>
          <p className="text-sm font-medium">Show comment counts</p>
          <p className="mt-0.5 text-xs text-[var(--foreground)]/55">Display the number of comments on posts</p>
        </div>
        <input
          type="checkbox"
          checked={showCommentCounts}
          onChange={(e) => {
            setShowCommentCounts(e.target.checked);
            void save({ showCommentCounts: e.target.checked });
          }}
          className="h-5 w-5 rounded accent-[var(--accent)]"
        />
      </label>
    </div>
  );
}
