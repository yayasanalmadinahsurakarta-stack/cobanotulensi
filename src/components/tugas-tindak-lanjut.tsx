import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  tugas: string;
  className?: string;
};

/** Menampilkan tugas panjang secara ringkas dan dapat dibuka tanpa meninggalkan halaman. */
export function TugasTindakLanjut({ tugas, className }: Props) {
  const perluDibuka = tugas.length > 110 || tugas.includes("\n");

  if (!perluDibuka) {
    return <p className={cn("m-0 max-w-[34rem] whitespace-pre-line font-medium leading-7", className)}>{tugas}</p>;
  }

  return (
    <details className={cn("group max-w-[34rem]", className)}>
      <summary className="cursor-pointer list-none rounded-md font-medium leading-7 text-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">
          {tugas.slice(0, 110).trimEnd()}…
          <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary">
            Baca lengkap
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </span>
        </span>
        <span className="hidden whitespace-pre-line group-open:inline">{tugas}</span>
        <span className="ml-2 hidden items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary group-open:inline-flex">
          Tutup
          <ChevronDown className="h-4 w-4 rotate-180" aria-hidden="true" />
        </span>
      </summary>
    </details>
  );
}