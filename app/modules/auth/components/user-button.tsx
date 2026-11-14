"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, KeyRound, BadgeCheck, Clock } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { signOut } from "@/app/modules/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

export interface UserButtonProps {
  className?: string;
  align?: "start" | "center" | "end";
}

export function UserButton({ className, align = "end" }: UserButtonProps) {
  const { data: session, isPending } = authClient.useSession();
  const [isSigningOut, startSignOut] = React.useTransition();

  if (isPending) {
    return (
      <div className={cn("flex size-9 items-center justify-center", className)}>
        <Spinner className="size-4 text-muted-foreground" />
        <span className="sr-only">Loading account</span>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/sign-in"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5 text-xs font-semibold shadow-xs hover:border-primary/40 focus-visible:ring-primary",
          className
        )}
      >
        <KeyRound className="size-3.5 text-primary" />
        <span>Sign In</span>
      </Link>
    );
  }

  const { name, email, image, id, emailVerified } = session.user;
  const displayName = name?.trim() || "Account";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const shortId = id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;

  // Uses the established server action (same one as the app's Sign out form):
  // deletes the session server-side, then Next.js redirects to /sign-in.
  const handleSignOut = () => {
    if (isSigningOut) return;
    startSignOut(async () => {
      await signOut();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className={cn(
          "group/user relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full ring-2 ring-transparent outline-hidden transition-[box-shadow,transform] duration-150 ease-emphasized hover:ring-primary/40 focus-visible:ring-primary focus-visible:outline-none active:scale-[0.96]",
          className
        )}
      >
        <Avatar size="default" className="size-9 ring-1 ring-border/80 transition-shadow">
          {image && <AvatarImage src={image} alt={displayName} />}
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        sideOffset={8}
        className="w-72 rounded-xl border border-border/80 bg-popover p-1.5 text-popover-foreground shadow-xl"
      >
        {/* Account header — plain markup, deliberately not a Menu.GroupLabel */}
        <div className="flex items-center gap-3 px-2 py-2.5">
          <Avatar size="default" className="size-11 ring-1 ring-border/80">
            {image && <AvatarImage src={image} alt={displayName} />}
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-[13px] font-semibold leading-5 text-foreground">
              {displayName}
            </p>
            <p className="truncate text-[11px] leading-4 text-muted-foreground">
              {email}
            </p>
            {emailVerified ? (
              <p className="flex items-center gap-1 pt-0.5 text-[10px] font-medium leading-4 text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="size-3" aria-hidden="true" />
                Email verified
              </p>
            ) : (
              <p className="flex items-center gap-1 pt-0.5 text-[10px] font-medium leading-4 text-amber-600 dark:text-amber-400">
                <Clock className="size-3" aria-hidden="true" />
                Verification pending
              </p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border/70" />

        {/* Account details */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 pb-1 text-[10px] font-semibold text-muted-foreground/80">
            Account
          </DropdownMenuLabel>
          <div className="flex items-center justify-between gap-3 px-2 pb-2">
            <div className="min-w-0">
              <p className="text-[10px] leading-4 text-muted-foreground">User ID</p>
              <p
                className="truncate font-mono text-[11px] leading-5 text-foreground"
                title={id}
              >
                {shortId}
              </p>
            </div>
            {/* Keep the menu open so the copy action stays usable */}
            <div onClick={(event) => event.stopPropagation()}>
              <CopyButton value={id} label="Copy user ID" />
            </div>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-border/70" />

        <DropdownMenuItem
          onClick={handleSignOut}
          variant="destructive"
          disabled={isSigningOut}
          className="cursor-pointer gap-2.5 rounded-lg px-2 py-2 text-xs font-medium data-disabled:cursor-not-allowed"
        >
          {isSigningOut ? (
            <Spinner className="size-4 text-destructive" />
          ) : (
            <LogOut className="size-4" aria-hidden="true" />
          )}
          <span>{isSigningOut ? "Signing out…" : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserButton;
