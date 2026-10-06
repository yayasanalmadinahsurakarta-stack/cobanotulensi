import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { LoncengNotifikasi } from "@/components/lonceng-notifikasi";
import { Tombol } from "@/components/tombol";
import { supabase } from "@/integrations/supabase/client";

/** Kontrol akun pengurus yang sedang masuk pada kepala portal umum. */
export function AkunPortal() {
  const [pengurusAktif, setPengurusAktif] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let aktif = true;
    async function periksaPengurus(userId?: string) {
      if (!userId) {
        if (aktif) setPengurusAktif(false);
        return;
      }
      const { data } = await supabase
        .from("pengurus")
        .select("id")
        .eq("user_id", userId)
        .eq("aktif", true)
        .maybeSingle();
      if (aktif) setPengurusAktif(Boolean(data));
    }
    supabase.auth.getUser().then(({ data }) => void periksaPengurus(data.user?.id));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void periksaPengurus(session?.user.id);
    });
    return () => {
      aktif = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!pengurusAktif) return null;

  async function keluar() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/pin", search: { lanjut: undefined }, replace: true });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <LoncengNotifikasi tujuan="portal" />
      <Link
        to="/profil"
        aria-label="Edit profil"
        title="Edit profil"
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border-2 border-border-field bg-card text-primary no-underline hover:bg-muted"
      >
        <UserRound aria-hidden="true" className="h-5 w-5" />
      </Link>
      <Tombol
        type="button"
        varian="sekunder"
        onClick={keluar}
        aria-label="Keluar akun"
        title="Keluar akun"
        className="h-11 min-h-11 w-11 min-w-11 px-0"
      >
        <LogOut aria-hidden="true" className="h-5 w-5" />
      </Tombol>
    </div>
  );
}