import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  "not-provisioned":
    "You're signed in, but this account hasn't been given portal access yet. Contact Voltair Studio.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const user = await getCurrentUser();
  const { error, redirect: redirectParam } = await searchParams;

  // Already signed in and provisioned → straight to the app.
  if (user?.role === "admin") redirect("/admin");
  if (user?.role === "client") redirect("/dashboard");

  const redirectTo =
    redirectParam && redirectParam.startsWith("/") ? redirectParam : "/dashboard";

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-80" />

      <div className="relative flex w-full max-w-sm flex-col items-center">
        <Image
          src="/brand/voltair-logo.png"
          alt="Voltair Studio"
          width={112}
          height={168}
          priority
          className="h-24 w-auto drop-shadow-[0_0_36px_rgba(255,79,0,0.4)]"
        />
        <h1 className="mt-6 text-center text-lg font-medium tracking-tight text-ink">
          Welcome to Portal Voltair
        </h1>
        <p className="mt-1.5 text-center text-sm text-ink-muted">
          Sign in to view your projects and deliverables.
        </p>

        <div className="mt-10 w-full">
          <LoginForm redirectTo={redirectTo} notice={error ? NOTICES[error] : undefined} />
        </div>
      </div>

      <p className="relative mt-16 font-mono text-[10px] uppercase tracking-[0.35em] text-ink-subtle">
        Voltair Studio
      </p>
    </main>
  );
}
