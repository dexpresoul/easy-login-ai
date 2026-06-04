import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Brain, FileText, Layers, ShieldCheck, Zap, GraduationCap, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SoalBloom — Generator Soal HOTS Otomatis untuk Guru Indonesia" },
      { name: "description", content: "Hasilkan soal HOTS Taksonomi Bloom C1–C6 dari materi PDF atau teks dalam hitungan detik. Dirancang untuk Kurikulum Merdeka & K-13." },
    ],
  }),
  component: Landing,
});

const BLOOM = [
  { code: "C1", label: "Mengingat", color: "bg-bloom-c1" },
  { code: "C2", label: "Memahami", color: "bg-bloom-c2" },
  { code: "C3", label: "Menerapkan", color: "bg-bloom-c3" },
  { code: "C4", label: "Menganalisis", color: "bg-bloom-c4" },
  { code: "C5", label: "Mengevaluasi", color: "bg-bloom-c5" },
  { code: "C6", label: "Mencipta", color: "bg-bloom-c6" },
];

function Landing() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">SoalBloom</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#fitur" className="text-sm text-muted-foreground hover:text-foreground">Fitur</a>
          <a href="#bloom" className="text-sm text-muted-foreground hover:text-foreground">Taksonomi Bloom</a>
          <a href="#alur" className="text-sm text-muted-foreground hover:text-foreground">Cara Kerja</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/auth">Masuk</Link></Button>
          <Button asChild><Link to="/auth">Mulai Gratis</Link></Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-12 pb-24 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            UJIAN AKHIR SEMESTER · UNESA · Teknik Informatika 2026
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Generator Soal <span className="gradient-text">HOTS Otomatis</span>
            <br />berbasis Taksonomi Bloom
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Unggah materi pelajaran dalam format PDF atau teks. Dalam hitungan detik, AI menghasilkan
            soal pilihan ganda, esai, dan benar/salah ber-label level Bloom C1–C6, sesuai Kurikulum
            Merdeka & K-13.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link to="/auth">Buat Soal Pertama Saya <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
              <a href="#alur">Lihat Cara Kerja</a>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Bahasa Indonesia</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Kurikulum Merdeka & K-13</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Ekspor PDF & Word</span>
          </div>
        </motion.div>

        {/* Bloom strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          id="bloom"
          className="surface-glow mx-auto mt-20 max-w-5xl rounded-3xl bg-card p-2"
        >
          <div className="rounded-2xl bg-gradient-to-b from-secondary/40 to-transparent p-6 md:p-10">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Distribusi Kognitif</p>
                <h3 className="font-display text-2xl font-bold">Taksonomi Bloom (Revisi)</h3>
              </div>
              <Brain className="h-8 w-8 text-primary opacity-70" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {BLOOM.map((b, i) => (
                <motion.div
                  key={b.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="rounded-xl border border-border bg-background/60 p-4"
                >
                  <div className={`mb-2 inline-flex h-7 items-center rounded-md ${b.color} px-2 text-xs font-bold text-foreground/80`}>
                    {b.code}
                  </div>
                  <p className="text-sm font-semibold">{b.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="fitur" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Fitur yang dibuat untuk guru Indonesia</h2>
          <p className="mt-3 text-muted-foreground">
            Berdasarkan riset PGRI: guru menghabiskan 4–8 jam/minggu hanya untuk menyusun soal.
            SoalBloom memangkasnya menjadi menit.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { icon: FileText, t: "Unggah PDF / Teks", d: "Parser cerdas mengekstrak materi dari PDF buku ajar, modul, atau salin-tempel teks langsung." },
            { icon: Brain, t: "Prompt Berbasis Pedagogi", d: "Setiap permintaan ke AI disusun berdasarkan deskriptor Bloom — bukan hafalan generik." },
            { icon: Layers, t: "Label Bloom Otomatis", d: "Setiap soal ter-tag C1–C6. Verifikasi distribusi kognitif dalam satu lirik." },
            { icon: GraduationCap, t: "Konteks Kurikulum", d: "Disesuaikan dengan Kurikulum Merdeka & K-13, jenjang SD hingga SMA/SMK." },
            { icon: Zap, t: "Multi-Format Soal", d: "Pilihan ganda, esai, dan benar/salah — lengkap dengan kunci jawaban & pembahasan." },
            { icon: ShieldCheck, t: "Bank Soal Pribadi", d: "Semua soal tersimpan otomatis, aman per akun, siap diekspor ke PDF atau Word." },
          ].map((f) => (
            <div key={f.t} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-accent/20 group-hover:text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold">{f.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="alur" className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary to-primary/80 p-10 text-primary-foreground md:p-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Alur Kerja</p>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Dari materi mentah ke soal HOTS dalam 4 langkah</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              ["01", "Unggah Materi", "Tarik PDF atau tempelkan teks materi pelajaran Anda."],
              ["02", "Atur Konfigurasi", "Pilih jumlah soal, jenis, dan level Bloom yang diinginkan."],
              ["03", "Generasi AI", "Google Gemini menyusun soal sesuai prompt berbasis pedagogi."],
              ["04", "Tinjau & Ekspor", "Simpan ke bank soal, edit jika perlu, lalu ekspor ke PDF/Word."],
            ].map(([n, t, d]) => (
              <div key={n} className="rounded-2xl bg-primary-foreground/5 p-5 ring-1 ring-primary-foreground/10">
                <p className="font-display text-3xl font-extrabold text-accent">{n}</p>
                <h4 className="mt-3 font-display text-lg font-bold">{t}</h4>
                <p className="mt-1 text-sm text-primary-foreground/70">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24 text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Siap memangkas waktu menyusun soal?</h2>
        <p className="mt-3 text-muted-foreground">Daftar gratis, tanpa kartu kredit. Mulai dari soal pertama Anda hari ini.</p>
        <Button asChild size="lg" className="mt-6 h-12 px-8">
          <Link to="/auth">Mulai Sekarang <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <p>© 2026 SoalBloom · Universitas Negeri Surabaya · Teknik Informatika</p>
          <p>Dibangun oleh: Zakia, Gizelle, Desty · Dosen: I Made Suartana, S.Kom., M.Kom.</p>
        </div>
      </footer>
    </main>
  );
}
