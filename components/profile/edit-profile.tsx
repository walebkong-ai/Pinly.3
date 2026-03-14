"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload, Check, X, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  const [usernameError, setUsernameError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    setUploading(true);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData
    });

    setUploading(false);

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error ?? "Avatar upload failed.");
      return;
    }

    const data = await response.json();
    setAvatarUrl(data.mediaUrl);
    toast.success("Avatar uploaded! Save profile to apply.");
  }

  async function handleSave() {
    setUsernameError(null);
    const cleanedUsername = username.trim();

    if (!cleanedUsername) {
      setUsernameError("Username is required.");
      return;
    }

    if (!/^[a-z0-9_-]{3,20}$/.test(cleanedUsername)) {
      setUsernameError("Use 3-20 lowercase letters, numbers, underscores, or hyphens");
      return;
    }

    setSaving(true);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: cleanedUsername,
        avatarUrl: avatarUrl || ""
      })
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json();
      if (data?.error === "Username has been taken") {
        setUsernameError("Username is already taken");
        return;
      }
      toast.error(data.error ?? "Failed to save profile.");
      return;
    }

    toast.success("Profile updated.");
    setIsEditing(false);
    
    // Refresh to update server components and header
    router.refresh();
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-4">
        <Avatar name={initialName} src={initialAvatarUrl} className="h-16 w-16" />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-[var(--font-serif)] text-4xl">{initialName}</h1>
            <Button variant="secondary" className="h-8 w-8 rounded-full p-0 flex items-center justify-center" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-[var(--foreground)]/62">@{initialUsername}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-5">
      <div className="relative group">
        <Avatar name={initialName} src={avatarUrl} className="h-16 w-16 transition-opacity group-hover:opacity-60" />
        <button
          type="button"
          disabled={uploading}
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
             if (file) void uploadFile(file);
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
          />
          {usernameError && <p className="mt-1 text-xs text-red-500">{usernameError}</p>}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || uploading} className="gap-2 px-3 py-1 h-8 text-xs">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save
          </Button>
          <Button variant="ghost" className="px-3 py-1 h-8 text-xs" onClick={() => {
            setIsEditing(false);
            setUsername(initialUsername);
            setAvatarUrl(initialAvatarUrl);
            setUsernameError(null);
          }} disabled={saving}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
