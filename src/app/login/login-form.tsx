"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { authErrorMessage, sendResetEmail, signInWithPassword } from "@/lib/firebase/auth-client";

export function LoginForm({ redirectTo, notice }: { redirectTo: string; notice?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(notice ?? null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [resetPending, setResetPending] = useState(false);

  function goToApp() {
    // The __session cookie is set by /api/login; replace + refresh so the
    // authenticated Server Components re-render with it.
    router.replace(redirectTo);
    router.refresh();
  }

  function onSubmit(formData: FormData) {
    setError(null);
    setInfo(null);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    startTransition(async () => {
      try {
        await signInWithPassword(email, password);
        goToApp();
      } catch (err) {
        setError(authErrorMessage(err));
      }
    });
  }

  async function onForgotPassword() {
    setError(null);
    setInfo(null);
    const email = String(new FormData(formRef.current ?? undefined).get("email") ?? "").trim();
    if (!email) {
      setError("Enter your email address above first, then tap “Forgot password”.");
      return;
    }
    setResetPending(true);
    const ok = await sendResetEmail(email);
    setResetPending(false);
    if (ok) {
      setInfo(`If an account exists for ${email}, a reset link is on its way — check your inbox and spam.`);
    } else {
      setError("Couldn't send a reset link right now. Try again in a moment.");
    }
  }

  const busy = pending || resetPending;

  return (
    <div className="w-full max-w-sm">
      <form ref={formRef} action={onSubmit} className="space-y-4">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={busy}
          placeholder="you@company.com"
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={busy}
          placeholder="••••••••••"
        />

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-critical/30 bg-critical/10 px-3 py-2 text-sm text-critical"
          >
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-lg border border-positive/30 bg-positive/10 px-3 py-2 text-sm text-positive">
            {info}
          </p>
        )}

        <Button type="submit" className="w-full" loading={pending} disabled={busy}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <button
        type="button"
        onClick={onForgotPassword}
        disabled={busy}
        className="mt-4 block w-full text-center text-xs text-ink-subtle transition-colors hover:text-brand-persimmon disabled:opacity-55"
      >
        {resetPending ? "Sending reset link…" : "Forgot password?"}
      </button>

      <p className="mt-8 text-center text-xs leading-5 text-ink-subtle">
        Access is invite-only. Contact Voltair Studio if you need an account.
      </p>
      <p className="mt-2 text-center text-xs text-ink-subtle">
        <Link href="/privacy" className="transition-colors hover:text-brand-persimmon">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
