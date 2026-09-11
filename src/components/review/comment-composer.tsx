"use client";

import { Send } from "lucide-react";
import { type Ref, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AttachmentDropzone } from "@/components/review/attachment-dropzone";
import { Button } from "@/components/ui/button";
import type { CommentAttachment } from "@/types";

export interface ComposerHandle {
  /** Prepend a prefix and focus, cursor at end. Used by "Request changes". */
  insertPrefix: (prefix: string) => void;
}

export function CommentComposer({
  clientId,
  disabled,
  onPost,
  ref,
  allowAttachments = true,
  placeholder,
}: {
  clientId: string;
  disabled?: boolean;
  onPost: (text: string, attachments: CommentAttachment[]) => void;
  ref?: Ref<ComposerHandle>;
  allowAttachments?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<CommentAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      insertPrefix(prefix) {
        setText((prev) => (prev.startsWith(prefix) ? prev : prefix + prev));
        const ta = textareaRef.current;
        ta?.focus();
        requestAnimationFrame(() => {
          if (ta) ta.selectionStart = ta.selectionEnd = ta.value.length;
        });
      },
    }),
    [],
  );

  // Auto-grow the textarea (DOM sync).
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [text]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onPost(trimmed, attachments);
    setText("");
    setAttachments([]);
  }

  return (
    <div className="border-t border-zinc-800 bg-surface-1 p-3">
      <textarea
        ref={textareaRef}
        value={text}
        disabled={disabled}
        rows={1}
        placeholder={
          disabled ? "Connecting to the feedback thread…" : (placeholder ?? "Add a comment")
        }
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter (or any IME composition) inserts a newline.
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className="w-full resize-none rounded-lg border border-zinc-800 bg-brand-obsidian px-3 py-2 text-[13px] text-ink placeholder:text-ink-subtle focus:border-brand-persimmon focus:outline-none focus:ring-2 focus:ring-brand-persimmon/25"
      />

      {allowAttachments && (
        <div className="mt-2">
          <AttachmentDropzone
            clientId={clientId}
            attachments={attachments}
            onChange={setAttachments}
            disabled={disabled}
          />
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-ink-subtle">Enter to send · Shift+Enter for a new line</span>
        <Button
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="h-9 px-4 text-[13px]"
        >
          <Send className="size-3.5" />
          Post
        </Button>
      </div>
    </div>
  );
}
