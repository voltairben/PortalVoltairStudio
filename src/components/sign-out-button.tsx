"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOutEverywhere } from "@/lib/firebase/auth-client";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await signOutEverywhere();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={signOut}
        aria-label="Sign out"
        title="Sign out"
        className="flex size-11 items-center justify-center rounded-md text-ink-muted transition-colors hover:text-brand-persimmon disabled:opacity-50"
      >
        <LogOut className="size-[18px]" />
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={signOut}
      className="text-sm text-ink-muted transition-colors hover:text-brand-persimmon disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
