import { Link, type LinkComponentProps } from "@tanstack/react-router";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Varian = "utama" | "sekunder" | "bahaya";

const dasar =
  "inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-base font-semibold no-underline transition-colors";

const varianKelas: Record<Varian, string> = {
  utama: "bg-primary text-primary-foreground hover:bg-primary-pressed",
  sekunder:
    "border-2 border-border-field bg-card text-primary hover:bg-muted",
  bahaya: "border-2 border-destructive bg-card text-destructive hover:bg-status-danger-bg",
};

export function Tombol({
  varian = "utama",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { varian?: Varian; children: ReactNode }) {
  return (
    <button className={cn(dasar, varianKelas[varian], className)} {...props}>
      {children}
    </button>
  );
}

export function TautanTombol({
  varian = "utama",
  className,
  children,
  ...props
}: LinkComponentProps & { varian?: Varian; children: ReactNode }) {
  return (
    <Link className={cn(dasar, varianKelas[varian], className)} {...props}>
      {children}
    </Link>
  );
}
