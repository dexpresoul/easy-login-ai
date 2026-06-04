import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Library, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/bank")({
  component: BankPage,
});

type SetRow = {
  id: string;
  title: string;
  subject: string | null;
  grade_level: string | null;
  curriculum: string | null;
  created_at: string;
  bloom_distribution: Record<string, number> | null;
};

function BankPage() {
  const [rows, setRows] = useState<SetRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("question_sets")
      .select("id,title,subject,grade_level,curriculum,created_at,bloom_distribution")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return rows;
    return rows.filter((r) =>
      r.title.toLowerCase().includes(t) ||
      (r.subject ?? "").toLowerCase().includes(t) ||
      (r.grade_level ?? "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  async function onDelete(id: string) {
    if (!confirm("Hapus set soal ini? Tindakan ini tidak bisa dibatalkan.")) return;
    const { error } = await supabase.from("question_sets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Set soal dihapus");
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bank Soal</p>
          <h1 className="font-display text-3xl font-bold">Semua Set Soal Saya</h1>
        </div>
        <Button asChild><Link to="/app/generate">Buat Baru</Link></Button>
      </div>

      <div className="mt-6 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari berdasarkan judul, mata pelajaran, jenjang…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
            <Library className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">{rows.length === 0 ? "Belum ada set soal" : "Tidak ada hasil"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length === 0 ? "Buat set soal pertama Anda." : "Coba kata kunci lain."}
            </p>
            {rows.length === 0 && <Button asChild className="mt-4"><Link to="/app/generate">Mulai</Link></Button>}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition hover:shadow-md">
                <Link to="/app/sets/$id" params={{ id: s.id }} className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[s.subject, s.grade_level, s.curriculum].filter(Boolean).join(" · ")} ·{" "}
                    {new Date(s.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.bloom_distribution && Object.entries(s.bloom_distribution).filter(([, v]) => (v as number) > 0).map(([k, v]) => (
                      <span key={k} className={`inline-flex h-5 items-center rounded bg-bloom-${k.toLowerCase()} px-1.5 text-[10px] font-bold text-foreground/80`}>
                        {k} × {v as number}
                      </span>
                    ))}
                  </div>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => onDelete(s.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
