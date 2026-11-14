import { Metadata } from "next";
import { Suspense } from "react";
import { SigninForm } from "@/app/modules/auth/components/sign-in-form";
import { requireUnAuth } from "@/app/modules/auth/actions";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to your CoralFrame account with Google, GitHub, or email and password.",
};

type SignInSearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safeCallbackURL(value: string | undefined): string {
  // Only allow same-origin paths; anything else falls back to the app root.
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/";
}

function SignInSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading sign in form"
      className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-border/70 bg-card px-6 py-10 text-center shadow-[0_1px_2px_rgba(17,17,20,0.04),0_16px_40px_-16px_rgba(17,17,20,0.18)] ring-1 ring-foreground/[0.06]"
    >
      <div className="size-12 animate-pulse rounded-xl bg-muted" />
      <div className="space-y-2">
        <div className="mx-auto h-6 w-44 animate-pulse rounded-md bg-muted" />
        <div className="mx-auto h-4 w-56 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid h-10 w-full animate-pulse grid-cols-2 gap-1 rounded-lg bg-muted p-1" />
      <div className="grid w-full grid-cols-2 gap-2.5">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}

export default function SigninPage({
  searchParams,
}: {
  searchParams: SignInSearchParams;
}) {
  // Cache Components: request data (headers() via the auth gate, and
  // searchParams) must live inside a Suspense boundary.
  return (
    <Suspense fallback={<SignInSkeleton />}>
      <SigninGate searchParams={searchParams} />
    </Suspense>
  );
}

async function SigninGate({
  searchParams,
}: {
  searchParams: SignInSearchParams;
}) {
  await requireUnAuth();

  const params = await searchParams;
  const callbackURL = safeCallbackURL(firstParam(params.callbackURL));
  const urlError = firstParam(params.error);

  return <SigninForm callbackURL={callbackURL} urlError={urlError ?? null} />;
}
