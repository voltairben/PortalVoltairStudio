"use client";

import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { refreshClaims } from "@/lib/firebase/auth-client";
import { auth, db, storage } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/types";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function AccountForm({
  uid,
  name,
  email,
  picture,
  phone,
  jobTitle,
}: {
  uid: string;
  name: string | null;
  email: string | null;
  picture: string | null;
  phone: string | null;
  jobTitle: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState(picture);
  const [displayName, setDisplayName] = useState(name ?? "");
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [jobTitleValue, setJobTitleValue] = useState(jobTitle ?? "");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleAvatarPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setSaved(false);
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Pick an image under 5 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file.");
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `avatars/${uid}/${Date.now()}-${safeName}`;
      const snap = await uploadBytes(ref(storage, path), file, { contentType: file.type });
      const url = await getDownloadURL(snap.ref);
      setAvatarUrl(url);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Enter a name.");
      return;
    }
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in.");

      await updateProfile(user, { displayName: trimmedName, photoURL: avatarUrl ?? null });
      await refreshClaims();
      await setDoc(
        doc(db, COLLECTIONS.users, uid),
        {
          displayName: trimmedName,
          avatarUrl: avatarUrl ?? null,
          phone: phoneValue.trim() || null,
          jobTitle: jobTitleValue.trim() || null,
        },
        { merge: true },
      );

      setSaved(true);
      router.refresh();
    } catch {
      setError("Couldn't save your changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-line-strong bg-surface-1 p-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar src={avatarUrl} name={displayName || email} className="size-16 text-lg" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Change profile picture"
            className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border border-line-strong bg-surface-2 text-ink-muted transition-colors hover:text-brand-persimmon disabled:opacity-55"
          >
            <Camera className="size-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              handleAvatarPick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-ink">{displayName || "—"}</p>
          <p className="truncate text-[13px] text-ink-muted">{email}</p>
          {uploading && <p className="mt-0.5 text-[11px] text-ink-subtle">Uploading photo…</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        <TextField
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={saving}
        />
        <TextField
          label="Job title"
          placeholder="e.g. Marketing Manager"
          value={jobTitleValue}
          onChange={(e) => setJobTitleValue(e.target.value)}
          disabled={saving}
        />
        <TextField
          label="Phone"
          type="tel"
          placeholder="+31 6 12345678"
          value={phoneValue}
          onChange={(e) => setPhoneValue(e.target.value)}
          disabled={saving}
        />
      </div>

      {error && <p className="mt-4 text-[12px] text-critical">{error}</p>}
      {saved && !error && <p className="mt-4 text-[12px] text-positive">Saved.</p>}

      <div className="mt-5">
        <Button onClick={handleSave} loading={saving} disabled={uploading}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
