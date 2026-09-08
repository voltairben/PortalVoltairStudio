"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOutEverywhere } from "@/lib/firebase/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await signOutEverywhere();
        } finally {
          router.replace("/login");
          router.refresh();
        }
      }}
      className="text-sm text-ink-muted transition-colors hover:text-brand-persimmon disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
