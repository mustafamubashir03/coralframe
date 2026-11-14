import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandMarkSize = "sm" | "md" | "lg";

const markSizes: Record<BrandMarkSize, string> = {
  sm: "size-6 rounded-[7px]",
  md: "size-7 rounded-lg",
  lg: "size-9 rounded-[10px]",
};

const iconSizes: Record<BrandMarkSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

export function BrandMark({
  size = "md",
  className,
}: {
  size?: BrandMarkSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-tr from-[#E0234E] to-[#FF4E6B] text-white shadow-[0_2px_10px_-2px_rgba(224,35,78,0.45)]",
        markSizes[size],
        className
      )}
    >
      <Flame className={cn("text-white", iconSizes[size])} strokeWidth={2.25} />
    </span>
  );
}

export function BrandWordmark({
  size = "md",
  href = "/",
  className,
}: {
  size?: BrandMarkSize;
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="CoralFrame home"
      className={cn(
        "group flex w-fit items-center gap-2.5 rounded-md font-heading font-semibold tracking-tight text-foreground transition-opacity duration-150 ease-emphasized hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <BrandMark size={size} className="transition-transform duration-200 ease-emphasized group-hover:scale-105" />
      <span className="text-[15px] leading-none">CoralFrame</span>
    </Link>
  );
}
