import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Loader2, Wand2, X, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import { generateQuestions } from "@/lib/questions.functions";

export const Route = createFileRoute("/_authenticated/app/generate")({
  component: GeneratePage,
});

const BLOOM_OPTIONS = [
  { code: "C1", label: "Mengingat" },
  { code: "C2", label: "Memahami" },
  { code: "C3", label: "Menerapkan" },
  { code: "C4", label: "Menganalisis" },
  { code: "C5", label: "Mengevaluasi" },
  { code: "C6", label: "Mencipta" },
] as const;

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // @ts-ignore - worker import
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(" ") + "\n\n";
  }
  return text.replace(/\s+/g, " ").trim();
}

function GeneratePage() {
  const navigate = useNavigate();
  const generate = useServerFn(generateQuestions);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("SMA Kelas X");
  const [curriculum, setCurriculum] = useState<"Kurikulum Merdeka" | "Kurikulum 2013" | "Lainnya">("Kurikulum Merdeka");
  const [material, setMaterial] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [filename, setFilename] = useState<string | undefined>();
  const [mc, setMc] = useState(5);
  const [essay, setEssay] = useState(2);
  const [tf, setTf] = useState(3);
  const [levels, setLevels] = useState<Set<string>>(new Set(["C3", "C4", "C5"]));
  const [parsing, setParsing] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onLoadUrl() {
    if (!sourceUrl.trim()) return toast.error("Masukkan URL artikel terlebih dahulu.");
    try {
      const url = new URL(sourceUrl.trim());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("URL tidak bisa diakses.");
      const html = await res.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();

      if (text.length < 50) {
        return toast.error("Teks artikel terlalu pendek atau tidak terbaca.");
      }

      setMaterial(text);
      if (!title) setTitle(url.hostname.replace(/^www\./, ""));
      setFilename(url.hostname);
      toast.success(`Berhasil mengambil ${text.length.toLocaleString("id-ID")} karakter dari URL`);
    } catch (err: any) {
      toast.error("Gagal mengambil artikel", { description: err.message });
    }
  }

  function toggleLevel(c: string) {
    setLevels((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c); else n.add(c);
      return n;
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Hanya format PDF didukung untuk unggahan.");
      return;
    }
    setParsing(true);
    try {
      const text = await extractPdfText(f);
      if (!text || text.length < 50) {
        toast.error("Tidak ada teks yang berhasil diekstrak", { description: "PDF mungkin berupa gambar/scan. Coba salin-tempel teks langsung." });
      } else {
        setMaterial(text);
        setFilename(f.name);
        if (!title) setTitle(f.name.replace(/\.pdf$/i, ""));
        toast.success(`Berhasil mengekstrak ${text.length.toLocaleString("id-ID")} karakter`);
      }
    } catch (err: any) {
      toast.error("Gagal mem-parse PDF", { description: err.message });
    } finally {
      setParsing(false);
    }
  }

  async function onGenerate() {
    if (!title.trim() || !subject.trim() || material.trim().length < 50) {
      return toast.error("Lengkapi judul, mata pelajaran, dan materi (min. 50 karakter).");
    }
    if (levels.size === 0) return toast.error("Pilih minimal satu level Bloom.");
    if (mc + essay + tf === 0) return toast.error("Jumlah total soal harus lebih dari 0.");

    setBusy(true);
    try {
      const result = await generate({
        data: {
          title: title.trim(),
          subject: subject.trim(),
          gradeLevel,
          curriculum,
          material: material.trim(),
          filename,
          counts: { multiple_choice: mc, essay, true_false: tf },
          bloomLevels: Array.from(levels) as any,
          language: "Indonesia",
        },
      });
      toast.success(`Berhasil membuat ${result.count} soal!`);
      navigate({ to: "/app/sets/$id", params: { id: result.setId } });
    } catch (err: any) {
      toast.error("Generasi gagal", { description: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Buat Soal</p>
        <h1 className="font-display text-3xl font-bold">Generator Soal HOTS</h1>
        <p className="mt-1 text-muted-foreground">Unggah materi PDF atau tempelkan teks, atur konfigurasi, lalu biarkan AI menyusun soalnya.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Material */}
        <div className="space-y-6">
          <Section title="1. Materi Sumber" desc="PDF buku ajar, modul, atau teks materi pelajaran.">
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
              <input ref={fileRef} type="file" accept="application/pdf" onChange={onFile} className="hidden" />
              {filename ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-accent" />
                  <span className="font-medium">{filename}</span>
                  <button onClick={() => { setFilename(undefined); setMaterial(""); if (fileRef.current) fileRef.current.value = ""; }} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">Tarik & lepas PDF di sini, atau</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => fileRef.current?.click()} disabled={parsing}>
                    {parsing ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Mengekstrak…</> : "Pilih PDF"}
                  </Button>
                </>
              )}
            </div>
            <div className="mt-4">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atau tempel teks materi</Label>
              <Textarea
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                rows={10}
                placeholder="Tempel atau ketik materi pelajaran di sini…"
                className="mt-1.5 resize-y"
              />
              <p className="mt-1 text-xs text-muted-foreground">{material.length.toLocaleString("id-ID")} karakter</p>
            </div>

            <div className="mt-4">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atau masukkan URL artikel</Label>
              <div className="mt-1.5 flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://contoh.com/artikel" className="pl-9" />
                </div>
                <Button type="button" variant="outline" onClick={onLoadUrl}>Ambil</Button>
              </div>
            </div>

            {material.trim().length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-background/60 p-4">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview teks hasil parsing</Label>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {material.slice(0, 1200)}
                  {material.length > 1200 ? "…" : ""}
                </p>
              </div>
            )}
          </Section>

          <Section title="2. Konteks Materi" desc="Membantu AI menyusun soal sesuai konteks pembelajaran.">
            <div className="grid gap-4 md:grid-cols-2">
              <FormItem label="Judul Set Soal">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Misal: Latihan UH Bab 3 — Algoritma" />
              </FormItem>
              <FormItem label="Mata Pelajaran">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Misal: Informatika" />
              </FormItem>
              <FormItem label="Jenjang">
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["SD Kelas IV", "SD Kelas V", "SD Kelas VI", "SMP Kelas VII", "SMP Kelas VIII", "SMP Kelas IX", "SMA Kelas X", "SMA Kelas XI", "SMA Kelas XII", "SMK"].map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
              <FormItem label="Kurikulum">
                <Select value={curriculum} onValueChange={(v) => setCurriculum(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kurikulum Merdeka">Kurikulum Merdeka</SelectItem>
                    <SelectItem value="Kurikulum 2013">Kurikulum 2013 (K-13)</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            </div>
          </Section>
        </div>

        {/* Config sidebar */}
        <aside className="space-y-6">
          <Section title="3. Jumlah Soal">
            <CounterRow label="Pilihan Ganda" value={mc} onChange={setMc} max={20} />
            <CounterRow label="Esai" value={essay} onChange={setEssay} max={10} />
            <CounterRow label="Benar / Salah" value={tf} onChange={setTf} max={20} />
            <p className="pt-2 text-xs text-muted-foreground">Total: <strong>{mc + essay + tf}</strong> soal</p>
          </Section>

          <Section title="4. Level Bloom" desc="Pilih level kognitif yang ingin diuji.">
            <div className="grid grid-cols-2 gap-2">
              {BLOOM_OPTIONS.map((b) => {
                const on = levels.has(b.code);
                return (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => toggleLevel(b.code)}
                    className={`rounded-lg border p-3 text-left text-sm transition ${
                      on ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex h-5 items-center rounded bg-bloom-${b.code.toLowerCase()} px-1.5 text-[10px] font-bold text-foreground/80`}>{b.code}</span>
                      {on && <span className="text-xs text-accent-foreground">✓</span>}
                    </div>
                    <p className="mt-1 font-medium">{b.label}</p>
                  </button>
                );
              })}
            </div>
          </Section>

          <motion.div whileTap={{ scale: 0.98 }}>
            <Button size="lg" className="h-12 w-full text-base" onClick={onGenerate} disabled={busy}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menghasilkan soal…</> : <><Wand2 className="mr-2 h-4 w-4" /> Generate Soal</>}
            </Button>
          </motion.div>
          {busy && <p className="text-center text-xs text-muted-foreground">Proses dapat memakan waktu 10–25 detik.</p>}
        </aside>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-base font-bold">{title}</h3>
      {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function FormItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CounterRow({ label, value, onChange, max }: { label: string; value: number; onChange: (n: number) => void; max: number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="h-7 w-7 rounded-md border border-border bg-background hover:bg-secondary">−</button>
        <span className="w-8 text-center font-display font-bold">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} className="h-7 w-7 rounded-md border border-border bg-background hover:bg-secondary">+</button>
      </div>
    </div>
  );
}
