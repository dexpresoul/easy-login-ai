import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Masuk · SoalBloom" }, { name: "description", content: "Masuk atau daftar untuk mulai menghasilkan soal HOTS otomatis." }] }),
  component: AuthPage,
});

const DEMO_EMAIL = "demo@soalbloom.id";
const DEMO_PASSWORD = "demo1234";

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error("Gagal masuk", { description: error.message });
    toast.success("Selamat datang kembali!");
    navigate({ to: "/app" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) return toast.error("Gagal mendaftar", { description: error.message });
    toast.success("Akun dibuat — selamat datang!");
    navigate({ to: "/app" });
  }

  async function signInDemo() {
    setBusy(true);
    let { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    if (error) {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        options: { emailRedirectTo: `${window.location.origin}/app`, data: { full_name: "Akun Demo" } },
      });
      if (signUpErr && !/registered|exist/i.test(signUpErr.message)) {
        setBusy(false);
        return toast.error("Gagal masuk demo", { description: signUpErr.message });
      }
      ({ error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD }));
    }
    setBusy(false);
    if (error) return toast.error("Gagal masuk demo", { description: error.message });
    toast.success("Masuk sebagai akun demo");
    navigate({ to: "/app" });
  }

  return (
    <main className="grid min-h-screen md:grid-cols-2">
      {/* Brand side */}
      <div className="hidden flex-col justify-between bg-gradient-to-br from-primary to-primary/80 p-10 text-primary-foreground md:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold">SoalBloom</span>
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="font-display text-3xl font-bold leading-tight">
            "Dari materi mentah menjadi soal HOTS<br />ber-label Bloom — dalam hitungan detik."
          </p>
          <p className="mt-4 text-sm text-primary-foreground/70">
            Dirancang khusus untuk guru Indonesia. Mendukung Kurikulum Merdeka & K-13.
          </p>
        </motion.div>
        <p className="text-xs text-primary-foreground/60">© 2026 SoalBloom · UNESA</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <h1 className="font-display text-2xl font-bold">Selamat datang</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk atau buat akun baru untuk mulai.</p>

          <Tabs value={tab} onValueChange={setTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Masuk</TabsTrigger>
              <TabsTrigger value="signup">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="mt-6 space-y-4">
                <Field id="email" label="Email" icon={Mail}><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guru@sekolah.id" /></Field>
                <Field id="pwd" label="Kata Sandi" icon={Lock}><Input id="pwd" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
                <Button type="submit" disabled={busy} className="h-11 w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Masuk"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="mt-6 space-y-4">
                <Field id="name" label="Nama Lengkap" icon={User}><Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Budi Santoso" /></Field>
                <Field id="email2" label="Email" icon={Mail}><Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guru@sekolah.id" /></Field>
                <Field id="pwd2" label="Kata Sandi" icon={Lock}><Input id="pwd2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" /></Field>
                <Button type="submit" disabled={busy} className="h-11 w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buat Akun"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">← Kembali ke beranda</Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}

function Field({ id, label, icon: Icon, children }: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <div className="[&_input]:pl-9">{children}</div>
      </div>
    </div>
  );
}
