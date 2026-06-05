import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("type") === "recovery" || hash.get("access_token")) {
      setReady(true);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error("Gagal menyimpan kata sandi baru", { description: error.message });
    toast.success("Kata sandi berhasil diperbarui.");
    navigate({ to: "/auth" });
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <h1 className="font-display text-2xl font-bold">Reset Password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Masukkan kata sandi baru untuk akun Anda.</p>

        {!ready ? (
          <p className="mt-6 text-sm text-muted-foreground">Link reset tidak valid atau sudah kedaluwarsa.</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Kata Sandi Baru</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="new-password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" />
              </div>
            </div>
            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Password Baru"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}