"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  authErrorMessage,
  signInWithGoogle,
  signInWithPassword,
} from "@/lib/firebase/auth-client";

function GoogleGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4">
      <path
        fill="#FFC107"
        d="M43.6 20.5h-1.9V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.9 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

export function LoginForm({ redirectTo, notice }: { redirectTo: string; notice?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(notice ?? null);
  const [pending, startTransition] = useTransition();
  const [googlePending, setGooglePending] = useState(false);

  function goToApp() {
    // The __session cookie is set by /api/login; replace + refresh so the
    // authenticated Server Components re-render with it.
    router.replace(redirectTo);
    router.refresh();
  }

  function onSubmit(formData: FormData) {
    setError(null);
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

  async function onGoogle() {
    setError(null);
    setGooglePending(true);
    try {
      await signInWithGoogle();
      goToApp();
    } catch (err) {
      setError(authErrorMessage(err));
      setGooglePending(false);
    }
  }

  const busy = pending || googlePending;

  return (
    <div className="w-full max-w-sm">
      <form action={onSubmit} className="space-y-4">
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

        <Button type="submit" className="w-full" loading={pending} disabled={googlePending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-ink-subtle">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogle}
        loading={googlePending}
        disabled={pending}
      >
        {!googlePending && <GoogleGlyph />}
        Continue with Google
      </Button>

      <p className="mt-8 text-center text-xs leading-5 text-ink-subtle">
        Access is invite-only. Contact Voltair Studio if you need an account.
      </p>
    </div>
  );
}
