import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Library, Wand2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

type Setrow = { id: string; title: string; subject: string | null; created_at: string };

function Dashboard() {
  const { user } = useAuth();
  const [sets, setSets] = useState<Setrow[]>([]);
  const [totalQ, setTotalQ] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from("question_sets")
        .select("id,title,subject,created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      setSets(s ?? []);
      const { count } = await supabase.from("questions").select("id", { count: "exact", head: true });
      setTotalQ(count ?? 0);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dashboard</p>
          <h1 className="font-display text-3xl font-bold">Halo, {user?.user_metadata?.full_name || user?.email?.split("@")[0]} 👋</h1>
          <p className="mt-1 text-muted-foreground">Siap menyusun soal HOTS hari ini?</p>
        </div>
        <Button asChild size="lg">
          <Link to="/app/generate">Buat Soal Baru <Wand2 className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard label="Set Soal Tersimpan" value={sets.length >= 5 ? "5+" : String(sets.length)} icon={Library} />
        <StatCard label="Total Soal" value={String(totalQ)} icon={FileText} />
        <StatCard label="Level Bloom Didukung" value="C1–C6" icon={Wand2} />
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold">Set Soal Terbaru</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/app/bank">Lihat semua <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
        </div>
        {sets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
            <Wand2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">Belum ada soal</p>
            <p className="mt-1 text-sm text-muted-foreground">Mulai dengan mengunggah materi pelajaran Anda.</p>
            <Button asChild className="mt-4"><Link to="/app/generate">Buat Soal Pertama</Link></Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {sets.map((s) => (
              <Link
                key={s.id}
                to="/app/sets/$id"
                params={{ id: s.id }}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:border-accent/40 hover:shadow-md"
              >
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.subject} · {new Date(s.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}
