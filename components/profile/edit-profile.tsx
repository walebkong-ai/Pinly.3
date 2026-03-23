"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload, Check, X, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarPhotoEditor } from "@/components/profile/avatar-photo-editor";
import { normalizeProfileImageUrl } from "@/lib/media-url";
import { normalizeUsername, usernameRegex, usernameValidationMessage } from "@/lib/validation";

export function EditProfile({
  initialName,
  initialUsername,
  initialAvatarUrl
}: {
  initialName: string;
  initialUsername: string;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setUsername(initialUsername);
      setAvatarUrl(initialAvatarUrl);
    }
  }, [initialAvatarUrl, initialUsername, isEditing]);

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    setUploading(true);

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Avatar upload failed.");
        return;
      }

      const data = await response.json();
      const normalizedAvatarUrl = normalizeProfileImageUrl(data?.mediaUrl);

      if (!normalizedAvatarUrl) {
        toast.error("Avatar upload returned an invalid media URL.");
        return;
      }

      setAvatarUrl(normalizedAvatarUrl);
      setPendingAvatarFile(null);
      toast.success("Avatar uploaded! Save profile to apply.");
    } catch {
      toast.error("Avatar upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setUsernameError(null);
    const cleanedUsername = normalizeUsername(username);

    if (!cleanedUsername) {
      setUsernameError("Username is required.");
      return;
    }

    if (!usernameRegex.test(cleanedUsername)) {
      setUsernameError(usernameValidationMessage);
      return;
    }

    setSaving(true);

    let response: Response;
    try {
      response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanedUsername,
          avatarUrl: avatarUrl || ""
        })
      });
    } catch {
      setSaving(false);
      toast.error("Could not reach the server. Please try again.");
      return;
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    setSaving(false);

    if (!response.ok) {
      const fieldError = Array.isArray(data?.issues?.fieldErrors?.username) ? data.issues.fieldErrors.username[0] : null;

      if (typeof fieldError === "string") {
        setUsernameError(fieldError);
        return;
      }

      if (data?.error === "Username is already taken") {
        setUsernameError("Username is already taken");
        return;
      }

      toast.error(data?.error ?? "Failed to save profile.");
      return;
    }

    const nextUsername = typeof data?.user?.username === "string" ? data.user.username : cleanedUsername;
    const nextAvatarUrl =
      data?.user && "avatarUrl" in data.user ? (data.user.avatarUrl as string | null) : avatarUrl;

    toast.success("Profile updated.");
    setIsEditing(false);
    setUsername(nextUsername);
    setAvatarUrl(nextAvatarUrl);

    if (nextUsername !== initialUsername) {
      router.replace(`/profile/${nextUsername}`);
      return;
    }

    router.refresh();
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-4 min-w-0">
        <Avatar name={initialName} src={avatarUrl} className="h-16 w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-[var(--font-serif)] text-3xl md:text-4xl truncate">{initialName}</h1>
            <Button variant="secondary" className="h-8 w-8 shrink-0 rounded-full p-0 flex items-center justify-center" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-[var(--foreground)]/62 truncate">@{username}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 sm:gap-5 min-w-0">
      <div className="relative group shrink-0">
        <Avatar name={initialName} src={avatarUrl} className="h-16 w-16 transition-opacity group-hover:opacity-60" />
        <button
          type="button"
          disabled={uploading || !!pendingAvatarFile}
          onClick={() => fileRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
        >
          {uploading ? (
            <LoaderCircle className="h-5 w-5 animate-spin text-white" />
          ) : (
            <Upload className="h-5 w-5 text-white" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
             const file = event.target.files?.[0];
             if (file) setPendingAvatarFile(file);
             event.target.value = "";
          }}
        />
      </div>

      <div className="space-y-3 flex-1 max-w-sm">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-[var(--foreground)]/50">Username</label>
          <Input 
            value={username} 
            onChange={e => {
              setUsername(e.target.value.toLowerCase());
              if (usernameError) setUsernameError(null);
            }} 
            disabled={saving}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
            inputMode="text"
            maxLength={20}
            aria-invalid={Boolean(usernameError)}
          />
          {usernameError && <p className="mt-1 text-xs text-red-500">{usernameError}</p>}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || uploading || !!pendingAvatarFile} className="gap-2 px-3 py-1 h-8 text-xs">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save
          </Button>
          <Button variant="ghost" className="px-3 py-1 h-8 text-xs" onClick={() => {
            setIsEditing(false);
            setUsername(initialUsername);
            setAvatarUrl(initialAvatarUrl);
            setPendingAvatarFile(null);
            setUsernameError(null);
          }} disabled={saving}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
        {pendingAvatarFile ? (
          <AvatarPhotoEditor
            file={pendingAvatarFile}
            name={initialName}
            onCancel={() => setPendingAvatarFile(null)}
            onSave={uploadFile}
          />
        ) : null}
      </div>
    </div>
  );
}
