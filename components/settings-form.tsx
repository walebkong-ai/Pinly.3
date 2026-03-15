"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Settings2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AvatarPhotoEditor } from "@/components/profile/avatar-photo-editor";

type SettingsFormProps = {
  initialProfile: {
    name: string;
    username: string;
    avatarUrl: string | null;
  };
  initialSettings: {
    showLikeCounts: boolean;
    commentsEnabled: boolean;
  };
};

export function SettingsForm({ initialProfile, initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl);
  const [showLikeCounts, setShowLikeCounts] = useState(initialSettings.showLikeCounts);
  const [commentsEnabled, setCommentsEnabled] = useState(initialSettings.commentsEnabled);
  const [savingKey, setSavingKey] = useState<"likes" | "comments" | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  async function saveSettings(
    updates: { showLikeCounts?: boolean; commentsEnabled?: boolean },
    savingState: "likes" | "comments"
  ) {
    setSavingKey(savingState);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        throw new Error("Could not save settings");
      }

      const data = await res.json();
      setShowLikeCounts(data.showLikeCounts ?? true);
      setCommentsEnabled(data.commentsEnabled ?? true);
      router.refresh();
      toast.success("Settings saved");
      return true;
    } catch {
      toast.error("Could not save settings");
      return false;
    } finally {
      setSavingKey(null);
    }
  }

  async function toggleLikeCounts(nextValue: boolean) {
    const previousValue = showLikeCounts;
    setShowLikeCounts(nextValue);
    const saved = await saveSettings({ showLikeCounts: nextValue }, "likes");
    if (!saved) {
      setShowLikeCounts(previousValue);
    }
  }

  async function toggleComments(nextValue: boolean) {
    const previousValue = commentsEnabled;
    setCommentsEnabled(nextValue);
    const saved = await saveSettings({ commentsEnabled: nextValue }, "comments");
    if (!saved) {
      setCommentsEnabled(previousValue);
    }
  }

  async function updateProfilePhoto(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    setUploadingAvatar(true);

    try {
      const uploadResponse = await fetch("/api/uploads", {
        method: "POST",
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => null);
        throw new Error(errorData?.error ?? "Profile photo upload failed.");
      }

      const uploadData = await uploadResponse.json();
      const profileResponse = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: uploadData.mediaUrl })
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json().catch(() => null);
        throw new Error(errorData?.error ?? "Could not update profile photo.");
      }

      setAvatarUrl(uploadData.mediaUrl);
      router.refresh();
      toast.success("Profile photo updated");
      setPendingAvatarFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border bg-[var(--surface-soft)] p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--foreground)]/10 text-[var(--foreground)]">
            <Settings2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Profile photo</p>
            <p className="text-xs text-[var(--foreground)]/56">Keep your avatar current across the app.</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <Avatar name={initialProfile.name} src={avatarUrl} className="h-20 w-20 shrink-0 border-2 border-[var(--surface-strong)]" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{initialProfile.name}</p>
            <p className="text-sm text-[var(--foreground)]/58">@{initialProfile.username}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar || !!pendingAvatarFile}
              >
                {uploadingAvatar ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {avatarUrl ? "Change photo" : "Upload photo"}
              </Button>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--foreground)]/56">
              On mobile, your browser can offer camera or photo library options automatically.
            </p>
          </div>
        </div>

        {pendingAvatarFile ? (
          <AvatarPhotoEditor
            file={pendingAvatarFile}
            name={initialProfile.name}
            onCancel={() => setPendingAvatarFile(null)}
            onSave={updateProfilePhoto}
          />
        ) : null}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setPendingAvatarFile(file);
            }
            event.target.value = "";
          }}
        />
      </section>

      <section className="space-y-4">
        <label className="flex items-center justify-between rounded-2xl border bg-[var(--surface-soft)] p-4">
          <div className="pr-4">
            <p className="text-sm font-medium">Show like counts</p>
            <p className="mt-0.5 text-xs text-[var(--foreground)]/55">
              Only hides the numbers on your device. Likes still work normally.
            </p>
          </div>
          <input
            type="checkbox"
            checked={showLikeCounts}
            disabled={savingKey === "likes"}
            onChange={(event) => {
              void toggleLikeCounts(event.target.checked);
            }}
            className="h-5 w-5 rounded accent-[var(--foreground)]"
          />
        </label>

        <label className="flex items-center justify-between rounded-2xl border bg-[var(--surface-soft)] p-4">
          <div className="pr-4">
            <p className="text-sm font-medium">Allow comments on your posts</p>
            <p className="mt-0.5 text-xs text-[var(--foreground)]/55">
              When off, comments are hidden and nobody can view or add them on your memories.
            </p>
          </div>
          <input
            type="checkbox"
            checked={commentsEnabled}
            disabled={savingKey === "comments"}
            onChange={(event) => {
              void toggleComments(event.target.checked);
            }}
            className="h-5 w-5 rounded accent-[var(--foreground)]"
          />
        </label>
      </section>
    </div>
  );
}
