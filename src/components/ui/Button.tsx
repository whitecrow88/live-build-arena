import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "danger" | "ghost" | "outline" | "amber";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-arena-accent text-arena-bg hover:bg-emerald-400 font-semibold",
  danger: "bg-arena-red text-white hover:bg-red-400 font-semibold",
  ghost: "bg-transparent text-arena-muted hover:text-white hover:bg-arena-surface",
  outline: "border border-arena-border text-white hover:border-arena-accent hover:text-arena-accent bg-transparent",
  amber: "bg-arena-amber text-arena-bg hover:bg-yellow-400 font-semibold",
};

const SIZES: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "outline",
  size = "md",
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled ?? loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-150",
        "font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arena-accent",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}
