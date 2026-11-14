"use client";

import * as React from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

// Official Google Brand Logo
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4 shrink-0", className)}
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

// Official GitHub Logo
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4 shrink-0 fill-current", className)}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

type AuthMode = "signin" | "signup";

gsap.registerPlugin(useGSAP);

type FieldName = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

export function SigninForm({
  className,
  callbackURL = "/",
  urlError = null,
}: {
  className?: string;
  callbackURL?: string;
  urlError?: string | null;
}) {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    urlError ? "Authentication failed. Please try again." : null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();
  const summaryRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const segmentedRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const [pillW, setPillW] = useState(0);

  // Measure the segmented control so the pill knows its exact travel distance.
  useEffect(() => {
    const measure = () => {
      const el = segmentedRef.current;
      if (!el) return;
      setPillW((el.clientWidth - 8 - 4) / 2);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (segmentedRef.current) observer.observe(segmentedRef.current);
    return () => observer.disconnect();
  }, []);

  // Slide the mode pill with a single restrained motion.
  useGSAP(() => {
    const pill = pillRef.current;
    if (!pill || pillW <= 0) return;
    const target = mode === "signin" ? 0 : pillW + 4;
    gsap.to(pill, {
      x: target,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.3,
      ease: "power3.out",
    });
  }, { dependencies: [mode, pillW] });

  // One orchestrated entrance moment, transform/opacity only.
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(cardRef.current, {
      opacity: 0,
      y: 18,
      duration: 0.55,
      ease: "expo.out",
    });
  });

  const isBusy = isPending || loadingProvider !== null;

  // Move focus to the error summary whenever an error is raised - failed
  // submits should land keyboard and screen-reader users on the problem.
  useEffect(() => {
    if (errorMessage) {
      summaryRef.current?.focus();
    }
  }, [errorMessage]);

  const clearFieldError = (field: FieldName) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});
  };

  // Social Sign In Handler (Google, GitHub)
  const handleSocialSignIn = async (provider: "google" | "github") => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoadingProvider(provider);

    startTransition(async () => {
      try {
        await authClient.signIn.social({
          provider,
          callbackURL,
        });
      } catch (err: unknown) {
        const error = err as Error;
        setErrorMessage(
          error?.message || `Failed to sign in with ${provider}. Please try again.`
        );
        setLoadingProvider(null);
      }
    });
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (mode === "signup" && !name.trim()) {
      errors.name = "Enter your name.";
    }
    if (!email || !email.includes("@")) {
      errors.email = "Enter a valid email address.";
    }
    if (!password || password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (mode === "signup" && password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    return errors;
  };

  // Email Sign In / Sign Up Form Submission
  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErrorMessage("Check the highlighted fields and try again.");
      return;
    }

    setLoadingProvider("email");

    startTransition(async () => {
      try {
        if (mode === "signin") {
          const res = await authClient.signIn.email({
            email,
            password,
            callbackURL,
          });

          if (res.error) {
            setErrorMessage(
              res.error.message || "Invalid email or password. Please try again."
            );
            setLoadingProvider(null);
            return;
          }

          setSuccessMessage("Signed in successfully. Redirecting...");
          router.push(callbackURL);
        } else {
          const res = await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL,
          });

          if (res.error) {
            setErrorMessage(
              res.error.message || "Could not create account. Please try again."
            );
            setLoadingProvider(null);
            return;
          }

          setSuccessMessage("Account created successfully. Redirecting...");
          router.push(callbackURL);
        }
      } catch (err: unknown) {
        const error = err as Error;
        setErrorMessage(
          error?.message || "An unexpected error occurred. Please try again."
        );
      } finally {
        setLoadingProvider(null);
      }
    });
  };

  const fieldError = (field: FieldName) => fieldErrors[field];
  const describedBy = (field: FieldName) =>
    fieldError(field) ? `${field}-error` : undefined;

  return (
    <Card
      ref={cardRef}
      className={cn(
        "relative w-full max-w-md gap-0 rounded-2xl border-border/70 bg-card py-0 shadow-[0_1px_2px_rgba(17,17,20,0.04),0_16px_40px_-16px_rgba(17,17,20,0.18)] ring-1 ring-foreground/[0.06] dark:shadow-[0_1px_2px_rgba(0,0,0,0.35),0_24px_48px_-20px_rgba(0,0,0,0.55)]",
        className
      )}
    >
      <CardHeader className="gap-3.5 px-6 pt-5 pb-4 text-center sm:px-8">
        <div className="flex justify-center">
          <BrandMark size="lg" className="rounded-xl shadow-[0_4px_14px_-4px_rgba(224,35,78,0.5)]" />
        </div>
        <div className="space-y-1.5">
          <CardTitle className="font-heading text-[22px] leading-7 font-semibold tracking-[-0.01em] text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your workspace"}
          </CardTitle>
          <CardDescription className="text-[13px] leading-5 text-muted-foreground">
            {mode === "signin"
              ? "Sign in to your CoralFrame workspace"
              : "One canvas for backend logic and AI automations"}
          </CardDescription>
        </div>

        {/* Segmented switch between Sign In and Sign Up — sliding pill */}
        <div
          role="group"
          aria-label="Authentication mode"
          ref={segmentedRef}
          className="relative grid h-10 grid-cols-2 gap-1 rounded-lg bg-muted p-1"
        >
          <span
            ref={pillRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-1 rounded-md bg-background shadow-xs"
            style={{ width: pillW > 0 ? pillW : "50%" }}
          />
          {(
            [
              { id: "signin" as const, label: "Sign in" },
              { id: "signup" as const, label: "Sign up" },
            ] as const
          ).map(({ id, label }) => {
            const selected = mode === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => switchMode(id)}
                disabled={isBusy}
                className={cn(
                  "relative z-10 rounded-md text-[13px] font-medium text-muted-foreground transition-colors duration-200 ease-emphasized outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "text-foreground" : "hover:text-foreground"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="gap-3.5 px-6 pb-5 sm:px-8">
        {/* Error summary - focus target for failed submissions */}
        {errorMessage && (
          <div
            ref={summaryRef}
            role="alert"
            tabIndex={-1}
            className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/[0.08] p-3 text-[13px] leading-5 text-destructive outline-none animate-in fade-in-50 duration-200"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Success notice */}
        {successMessage && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.08] p-3 text-[13px] leading-5 text-emerald-700 duration-200 animate-in fade-in-50 dark:text-emerald-400"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="font-medium">{successMessage}</div>
          </div>
        )}

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => handleSocialSignIn("google")}
            className="h-10 w-full justify-center gap-2 border-border/70 bg-background font-medium hover:border-foreground/15 hover:bg-muted"
          >
            {loadingProvider === "google" ? <Spinner className="size-4" /> : <GoogleIcon />}
            <span className="text-[13px] font-semibold">Google</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => handleSocialSignIn("github")}
            className="h-10 w-full justify-center gap-2 border-border/70 bg-background font-medium hover:border-foreground/15 hover:bg-muted"
          >
            {loadingProvider === "github" ? <Spinner className="size-4" /> : <GitHubIcon />}
            <span className="text-[13px] font-semibold">GitHub</span>
          </Button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center py-1" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="px-3 text-[11px] font-medium text-muted-foreground">
            or continue with email
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[13px] font-medium text-foreground">
                Full name
              </Label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="name"
                  type="text"
                  placeholder="Ada Lovelace"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError("name");
                  }}
                  disabled={isBusy}
                  required
                  autoComplete="name"
                  aria-invalid={fieldError("name") ? true : undefined}
                  aria-describedby={describedBy("name")}
                  className="h-10 bg-background pl-9 text-sm"
                />
              </div>
              {fieldError("name") && (
                <p id="name-error" className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {fieldError("name")}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium text-foreground">
              Email address
            </Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                disabled={isBusy}
                required
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                aria-invalid={fieldError("email") ? true : undefined}
                aria-describedby={describedBy("email")}
                className="h-10 bg-background pl-9 text-sm"
              />
            </div>
            {fieldError("email") && (
              <p id="email-error" className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {fieldError("email")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
                Password
              </Label>
              {mode === "signin" && (
                <button
                  type="button"
                  className="rounded-sm text-xs font-medium text-primary transition-colors duration-150 ease-emphasized hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() =>
                    setErrorMessage(
                      "Password reset isn't available yet. Contact support to regain access."
                    )
                  }
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                disabled={isBusy}
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                aria-invalid={fieldError("password") ? true : undefined}
                aria-describedby={describedBy("password")}
                className="h-10 bg-background pl-9 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isBusy}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-emphasized hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldError("password") && (
              <p id="password-error" className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {fieldError("password")}
              </p>
            )}
          </div>

          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-[13px] font-medium text-foreground"
              >
                Confirm password
              </Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError("confirmPassword");
                  }}
                  disabled={isBusy}
                  required
                  autoComplete="new-password"
                  aria-invalid={fieldError("confirmPassword") ? true : undefined}
                  aria-describedby={describedBy("confirmPassword")}
                  className="h-10 bg-background pl-9 text-sm"
                />
              </div>
              {fieldError("confirmPassword") && (
                <p
                  id="confirmPassword-error"
                  className="flex items-center gap-1.5 text-xs text-destructive"
                >
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {fieldError("confirmPassword")}
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={isBusy}
            className="group h-10 w-full text-[13px] font-semibold"
          >
            {loadingProvider === "email" ? (
              <div className="flex items-center gap-2">
                <Spinner className="size-4" />
                <span>{mode === "signin" ? "Signing in..." : "Creating account..."}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5">
                <span>{mode === "signin" ? "Sign in with email" : "Create account"}</span>
                <ArrowRight
                  className="size-4 transition-transform duration-200 ease-emphasized group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </div>
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-2.5 border-t border-border/60 px-6 py-3.5 sm:px-8">
        <p className="text-center text-[13px] text-muted-foreground">
          {mode === "signin" ? (
            <>
              Don&rsquo;t have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                disabled={isBusy}
                className="rounded-sm font-semibold text-primary underline-offset-4 transition-colors duration-150 ease-emphasized hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signin")}
                disabled={isBusy}
                className="rounded-sm font-semibold text-primary underline-offset-4 transition-colors duration-150 ease-emphasized hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Sign in
              </button>
            </>
          )}
        </p>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
          <Lock className="size-3" aria-hidden="true" />
          Secured with HTTP-only session cookies
        </p>
      </CardFooter>
    </Card>
  );
}
