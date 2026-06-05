import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, FileDown, FileText, Loader2, RefreshCcw, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { updateQuestion, regenerateQuestion } from "@/lib/question-actions.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/app/sets/$id")({
  component: SetDetail,
});

type SetRow = {
  id: string; title: string; subject: string | null; grade_level: string | null;
  curriculum: string | null; created_at: string; bloom_distribution: Record<string, number> | null;
};
type QRow = {
  id: string; position: number; question_type: "multiple_choice" | "essay" | "true_false";
  bloom_level: string; question_text: string; options: string[] | null;
  correct_answer: string; explanation: string;
};

const BLOOM_NAMES: Record<string, string> = {
  C1: "Mengingat", C2: "Memahami", C3: "Menerapkan",
  C4: "Menganalisis", C5: "Mengevaluasi", C6: "Mencipta",
};
const TYPE_NAMES: Record<string, string> = {
  multiple_choice: "Pilihan Ganda", essay: "Esai", true_false: "Benar / Salah",
};

function SetDetail() {
  const { id } = useParams({ from: "/_authenticated/app/sets/$id" });
  const saveQuestion = useServerFn(updateQuestion);
  const regenQuestion = useServerFn(regenerateQuestion);
  const [set, setSet] = useState<SetRow | null>(null);
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<QRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [regenBusyId, setRegenBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "",
    explanation: "",
  });

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: qs }] = await Promise.all([
        supabase.from("question_sets").select("*").eq("id", id).single(),
        supabase.from("questions").select("*").eq("set_id", id).order("position", { ascending: true }),
      ]);
      setSet(s as any);
      setQuestions((qs as any) ?? []);
      setLoading(false);
    })();
  }, [id]);

  function openEdit(q: QRow) {
    setEditing(q);
    setForm({
      questionText: q.question_text,
      optionA: q.options?.[0] ?? "",
      optionB: q.options?.[1] ?? "",
      optionC: q.options?.[2] ?? "",
      optionD: q.options?.[3] ?? "",
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
    });
  }

  async function onSaveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const options = editing.question_type === "multiple_choice"
        ? [form.optionA, form.optionB, form.optionC, form.optionD]
        : null;

      await saveQuestion({
        data: {
          id: editing.id,
          setId: id,
          questionText: form.questionText,
          options,
          correctAnswer: form.correctAnswer,
          explanation: form.explanation,
        },
      });

      setQuestions((prev) => prev.map((q) => q.id === editing.id ? {
        ...q,
        question_text: form.questionText,
        options,
        correct_answer: form.correctAnswer,
        explanation: form.explanation,
      } : q));
      setEditing(null);
      toast.success("Soal diperbarui");
    } catch (err: any) {
      toast.error("Gagal menyimpan perubahan", { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function onRegenerate(q: QRow) {
    setRegenBusyId(q.id);
    try {
      const result = await regenQuestion({ data: { id: q.id, setId: id } });
      setQuestions((prev) => prev.map((row) => row.id === q.id ? {
        ...row,
        question_text: result.question.question_text,
        options: (result.question.options as string[] | null) ?? null,
        correct_answer: result.question.correct_answer,
        explanation: result.question.explanation,
      } : row));
      toast.success("Soal berhasil di-regenerate");
    } catch (err: any) {
      toast.error("Gagal regenerate soal", { description: err.message });
    } finally {
      setRegenBusyId(null);
    }
  }

  async function exportPdf() {
    if (!set) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = margin;

    doc.setFont("helvetica", "bold").setFontSize(16);
    doc.text(set.title, margin, y); y += 22;
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(100);
    doc.text([set.subject, set.grade_level, set.curriculum].filter(Boolean).join(" · "), margin, y); y += 22;
    doc.setDrawColor(220); doc.line(margin, y, pageW - margin, y); y += 18;
    doc.setTextColor(20);

    questions.forEach((q, idx) => {
      const lines: string[] = [];
      lines.push(`${idx + 1}. [${q.bloom_level} · ${TYPE_NAMES[q.question_type]}] ${q.question_text}`);
      if (q.question_type === "multiple_choice" && q.options) {
        q.options.forEach((o, i) => lines.push(`   ${String.fromCharCode(65 + i)}. ${o}`));
      } else if (q.question_type === "true_false") {
        lines.push("   ( ) Benar    ( ) Salah");
      }
      const wrapped = doc.splitTextToSize(lines.join("\n"), pageW - margin * 2);
      if (y + wrapped.length * 14 > pageH - 60) { doc.addPage(); y = margin; }
      doc.setFontSize(11).text(wrapped, margin, y);
      y += wrapped.length * 14 + 8;
    });

    // Answer key page
    doc.addPage(); y = margin;
    doc.setFont("helvetica", "bold").setFontSize(14).text("Kunci Jawaban & Pembahasan", margin, y); y += 22;
    questions.forEach((q, idx) => {
      const block = `${idx + 1}. [${q.bloom_level}] Jawaban: ${q.correct_answer}\n   Pembahasan: ${q.explanation}`;
      const wrapped = doc.splitTextToSize(block, pageW - margin * 2);
      if (y + wrapped.length * 13 > pageH - 60) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "normal").setFontSize(10).text(wrapped, margin, y);
      y += wrapped.length * 13 + 8;
    });

    doc.save(`${set.title}.pdf`);
    toast.success("PDF diunduh");
  }

  async function exportDocx() {
    if (!set) return;
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");
    const children: any[] = [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: set.title, bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: [set.subject, set.grade_level, set.curriculum].filter(Boolean).join(" · "), italics: true, color: "666666" })] }),
      new Paragraph({ text: "" }),
    ];
    questions.forEach((q, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. `, bold: true }),
          new TextRun({ text: `[${q.bloom_level} · ${TYPE_NAMES[q.question_type]}] `, bold: true, color: "5b3ca0" }),
          new TextRun({ text: q.question_text }),
        ],
        spacing: { before: 160 },
      }));
      if (q.question_type === "multiple_choice" && q.options) {
        q.options.forEach((o, i) => children.push(new Paragraph({ text: `${String.fromCharCode(65 + i)}. ${o}`, indent: { left: 360 } })));
      } else if (q.question_type === "true_false") {
        children.push(new Paragraph({ text: "( ) Benar    ( ) Salah", indent: { left: 360 } }));
      }
    });
    children.push(new Paragraph({ text: "" }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Kunci Jawaban & Pembahasan", bold: true })], alignment: AlignmentType.LEFT }));
    questions.forEach((q, idx) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. `, bold: true }),
          new TextRun({ text: `Jawaban: ${q.correct_answer}`, bold: true }),
        ],
        spacing: { before: 100 },
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: `Pembahasan: ${q.explanation}`, italics: true, color: "444444" })] }));
    });

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${set.title}.docx`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Word diunduh");
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!set) return <div className="p-10 text-muted-foreground">Set tidak ditemukan.</div>;

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <Link to="/app/bank" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-3 w-3" /> Bank Soal</Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Set Soal</p>
          <h1 className="font-display text-3xl font-bold">{set.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[set.subject, set.grade_level, set.curriculum].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportDocx}><FileText className="mr-2 h-4 w-4" /> Word</Button>
          <Button onClick={exportPdf}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
        </div>
      </div>

      {/* Bloom distribution */}
      {set.bloom_distribution && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {Object.entries(set.bloom_distribution).filter(([, v]) => (v as number) > 0).map(([k, v]) => (
            <span key={k} className={`inline-flex h-6 items-center rounded-md bg-bloom-${k.toLowerCase()} px-2 text-xs font-bold text-foreground/80`}>
              {k} {BLOOM_NAMES[k]} · {v as number}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 space-y-4">
        {questions.map((q, idx) => (
          <article key={q.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-bold text-muted-foreground">Soal {idx + 1}</span>
              <span className={`inline-flex h-5 items-center rounded bg-bloom-${q.bloom_level.toLowerCase()} px-1.5 font-bold text-foreground/80`}>
                {q.bloom_level} · {BLOOM_NAMES[q.bloom_level]}
              </span>
              <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">{TYPE_NAMES[q.question_type]}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(q)}><SquarePen className="mr-2 h-3.5 w-3.5" /> Edit</Button>
                <Button variant="outline" size="sm" onClick={() => onRegenerate(q)} disabled={regenBusyId === q.id}>
                  {regenBusyId === q.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="mr-2 h-3.5 w-3.5" />}Re-generate
                </Button>
              </div>
            </div>
            <p className="font-medium leading-relaxed">{q.question_text}</p>
            {q.question_type === "multiple_choice" && q.options && (
              <ol className="mt-3 space-y-1.5 text-sm">
                {q.options.map((o, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const correct = q.correct_answer.trim().toUpperCase().startsWith(letter);
                  return (
                    <li key={i} className={`flex gap-2 rounded-md px-2 py-1 ${correct ? "bg-accent/15" : ""}`}>
                      <span className={`font-bold ${correct ? "text-accent-foreground" : "text-muted-foreground"}`}>{letter}.</span>
                      <span>{o}</span>
                    </li>
                  );
                })}
              </ol>
            )}
            {q.question_type === "true_false" && (
              <p className="mt-3 text-sm"><strong>Jawaban:</strong> {q.correct_answer}</p>
            )}
            {q.question_type === "essay" && (
              <div className="mt-3 rounded-md bg-secondary/60 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kunci Jawaban Model</p>
                <p className="mt-1">{q.correct_answer}</p>
              </div>
            )}
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">Pembahasan</summary>
              <p className="mt-2 text-muted-foreground">{q.explanation}</p>
            </details>
          </article>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Soal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Pertanyaan</Label>
              <Textarea value={form.questionText} onChange={(e) => setForm((prev) => ({ ...prev, questionText: e.target.value }))} rows={5} />
            </div>

            {editing?.question_type === "multiple_choice" && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5"><Label>Opsi A</Label><Input value={form.optionA} onChange={(e) => setForm((prev) => ({ ...prev, optionA: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Opsi B</Label><Input value={form.optionB} onChange={(e) => setForm((prev) => ({ ...prev, optionB: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Opsi C</Label><Input value={form.optionC} onChange={(e) => setForm((prev) => ({ ...prev, optionC: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Opsi D</Label><Input value={form.optionD} onChange={(e) => setForm((prev) => ({ ...prev, optionD: e.target.value }))} /></div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Jawaban Benar</Label>
              <Input value={form.correctAnswer} onChange={(e) => setForm((prev) => ({ ...prev, correctAnswer: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Pembahasan</Label>
              <Textarea value={form.explanation} onChange={(e) => setForm((prev) => ({ ...prev, explanation: e.target.value }))} rows={4} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button onClick={onSaveEdit} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
