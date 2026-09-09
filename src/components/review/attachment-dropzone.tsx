"use client";

import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { FileUp, Paperclip, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { storage } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import type { CommentAttachment } from "@/types";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPT = ["image/", "video/", "application/pdf"];

function accepted(file: File): string | null {
  if (file.size > MAX_BYTES) return "Files must be 50 MB or smaller.";
  if (!ACCEPT.some((prefix) => file.type.startsWith(prefix))) {
    return "Attach an image, video, or PDF.";
  }
  return null;
}

interface Uploading {
  name: string;
  progress: number;
}

export function AttachmentDropzone({
  clientId,
  attachments,
  onChange,
  disabled,
}: {
  clientId: string;
  attachments: CommentAttachment[];
  onChange: (next: CommentAttachment[]) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<Uploading | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    setError(null);
    const file = files?.[0];
    if (!file || disabled) return;

    const problem = accepted(file);
    if (problem) {
      setError(problem);
      return;
    }

    const path = `attachments/${clientId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${file.name}`;
    const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
    setUploading({ name: file.name, progress: 0 });

    task.on(
      "state_changed",
      (snap) => {
        setUploading({
          name: file.name,
          progress: Math.round((snap.bytesTransferred / snap.totalBytes) * 100),
        });
      },
      () => {
        setError("Upload failed. Try again.");
        setUploading(null);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onChange([
          ...attachments,
          { name: file.name, url, size: file.size, contentType: file.type },
        ]);
        setUploading(null);
      },
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-[12px] transition-colors",
          dragging
            ? "border-brand-persimmon bg-brand-persimmon/5 text-brand-persimmon"
            : "border-zinc-700 text-ink-subtle hover:border-zinc-600",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {uploading ? (
          <div className="w-full">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="truncate">Uploading {uploading.name}</span>
              <span className="tnum font-mono text-brand-persimmon">{uploading.progress}%</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-brand-persimmon transition-[width] duration-150"
                style={{ width: `${uploading.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <FileUp className="size-3.5" />
            <span>Drop a file or</span>
            <label
              htmlFor={inputId}
              className="cursor-pointer text-ink transition-colors hover:text-brand-persimmon"
            >
              browse
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              className="sr-only"
              disabled={disabled}
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      {error && <p className="mt-1.5 text-[11px] text-critical">{error}</p>}

      {attachments.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {attachments.map((a, i) => (
            <li
              key={a.url}
              className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-surface-2 py-1 pl-2 pr-1 text-[11px] text-ink-muted"
            >
              <Paperclip className="size-3 shrink-0" />
              <span className="max-w-32 truncate">{a.name}</span>
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                onClick={() => onChange(attachments.filter((_, j) => j !== i))}
                className="rounded p-0.5 text-ink-subtle transition-colors hover:text-critical"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
