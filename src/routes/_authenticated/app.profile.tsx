import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("full_name,school,subject").eq("id", user.id).single();
      setFullName(data?.full_name ?? user.user_metadata?.full_name ?? "");
      setSchool(data?.school ?? "");
      setSubject(data?.subject ?? "");
    })();
  }, [user]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      school,
      subject,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return toast.error("Gagal menyimpan profil", { description: error.message });
    toast.success("Profil berhasil diperbarui");
  }

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Profil</p>
        <h1 className="font-display text-3xl font-bold">Edit Profil</h1>
      </div>

      <form onSubmit={onSave} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-1.5">
          <Label>Nama Lengkap</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Sekolah</Label>
          <Input value={school} onChange={(e) => setSchool(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Mata Pelajaran</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy}>Simpan Profil</Button>
      </form>
    </div>
  );
}