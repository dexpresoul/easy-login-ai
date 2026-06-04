import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BLOOM_DESCRIPTIONS: Record<string, string> = {
  C1: "Mengingat (Remembering) — mengenali, menyebutkan, mengingat fakta dasar.",
  C2: "Memahami (Understanding) — menjelaskan ide/konsep dengan kata-kata sendiri.",
  C3: "Menerapkan (Applying) — menggunakan informasi pada situasi baru.",
  C4: "Menganalisis (Analyzing) — menguraikan informasi menjadi bagian-bagian dan menemukan hubungan.",
  C5: "Mengevaluasi (Evaluating) — memberi penilaian atau keputusan berdasarkan kriteria.",
  C6: "Mencipta (Creating) — menghasilkan ide, produk, atau cara pandang baru.",
};

const InputSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(120),
  gradeLevel: z.string().min(1).max(60),
  curriculum: z.enum(["Kurikulum Merdeka", "Kurikulum 2013", "Lainnya"]),
  material: z.string().min(50).max(40000),
  filename: z.string().max(200).optional(),
  counts: z.object({
    multiple_choice: z.number().int().min(0).max(20),
    essay: z.number().int().min(0).max(10),
    true_false: z.number().int().min(0).max(20),
  }),
  bloomLevels: z.array(z.enum(["C1", "C2", "C3", "C4", "C5", "C6"])).min(1),
  language: z.string().default("Indonesia"),
});

type QuestionOut = {
  question_type: "multiple_choice" | "essay" | "true_false";
  bloom_level: "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
  question_text: string;
  options?: string[] | null;
  correct_answer: string;
  explanation: string;
};

function buildPrompt(p: z.infer<typeof InputSchema>) {
  const bloomList = p.bloomLevels.map((l) => `- ${l}: ${BLOOM_DESCRIPTIONS[l]}`).join("\n");
  const totalMC = p.counts.multiple_choice;
  const totalEssay = p.counts.essay;
  const totalTF = p.counts.true_false;
  return `Anda adalah ahli pedagogi dan penyusun soal HOTS (Higher Order Thinking Skills) untuk kurikulum Indonesia.

KONTEKS:
- Mata Pelajaran: ${p.subject}
- Jenjang: ${p.gradeLevel}
- Kurikulum: ${p.curriculum}
- Bahasa: ${p.language}

LEVEL TAKSONOMI BLOOM yang diminta (distribusikan secara merata dan masuk akal):
${bloomList}

JUMLAH SOAL:
- Pilihan Ganda: ${totalMC} soal (4 opsi A-D, satu jawaban benar)
- Esai: ${totalEssay} soal (jawaban berupa uraian, sertakan kunci jawaban model)
- Benar/Salah: ${totalTF} soal (jawaban "Benar" atau "Salah")

MATERI SUMBER:
"""
${p.material.slice(0, 20000)}
"""

ATURAN PENTING:
1. Setiap soal harus relevan dengan materi sumber, jangan menambah fakta di luar materi.
2. Untuk level C4-C6, soal HARUS menuntut analisis, evaluasi, atau penciptaan — bukan hafalan.
3. Gunakan Bahasa Indonesia formal dan jelas, sesuai jenjang ${p.gradeLevel}.
4. Untuk pilihan ganda: berikan distractor yang masuk akal (bukan jawaban absurd).
5. Sertakan "explanation" yang menjelaskan mengapa jawaban benar.
6. Field "bloom_level" wajib salah satu dari: C1,C2,C3,C4,C5,C6.
7. Untuk pilihan ganda, "correct_answer" berisi HURUF opsi (A/B/C/D). "options" berisi array 4 string TANPA prefiks "A.".
8. Untuk benar/salah, "options" boleh null, "correct_answer" = "Benar" atau "Salah".
9. Untuk esai, "options" = null, "correct_answer" berisi kunci jawaban model.

Kembalikan HANYA JSON valid sesuai schema. Jangan menulis teks lain.`;
}

const tools = [
  {
    type: "function",
    function: {
      name: "submit_questions",
      description: "Submit array of generated HOTS questions.",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_type: { type: "string", enum: ["multiple_choice", "essay", "true_false"] },
                bloom_level: { type: "string", enum: ["C1", "C2", "C3", "C4", "C5", "C6"] },
                question_text: { type: "string" },
                options: { type: ["array", "null"], items: { type: "string" } },
                correct_answer: { type: "string" },
                explanation: { type: "string" },
              },
              required: ["question_type", "bloom_level", "question_text", "correct_answer", "explanation"],
              additionalProperties: false,
            },
          },
        },
        required: ["questions"],
        additionalProperties: false,
      },
    },
  },
];

export const generateQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY belum dikonfigurasi");

    const total = data.counts.multiple_choice + data.counts.essay + data.counts.true_false;
    if (total === 0) throw new Error("Jumlah total soal harus lebih dari 0");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Anda adalah generator soal HOTS yang teliti dan berbasis pedagogi Taksonomi Bloom." },
          { role: "user", content: buildPrompt(data) },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "submit_questions" } },
      }),
    });

    if (res.status === 429) throw new Error("Batas permintaan AI terlampaui. Coba lagi beberapa saat.");
    if (res.status === 402) throw new Error("Kuota AI Lovable habis. Tambahkan kredit di workspace.");
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI Gateway error ${res.status}: ${t.slice(0, 300)}`);
    }

    const payload = await res.json();
    const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI tidak mengembalikan tool call yang valid.");
    let parsed: { questions: QuestionOut[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Gagal mem-parsing hasil AI.");
    }

    const questions = (parsed.questions || []).filter((q) => q.question_text && q.correct_answer);
    if (questions.length === 0) throw new Error("AI tidak menghasilkan soal apa pun.");

    const { supabase, userId } = context;

    // bloom distribution
    const dist: Record<string, number> = { C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0 };
    questions.forEach((q) => (dist[q.bloom_level] = (dist[q.bloom_level] || 0) + 1));

    const { data: setRow, error: setErr } = await supabase
      .from("question_sets")
      .insert({
        user_id: userId,
        title: data.title,
        subject: data.subject,
        grade_level: data.gradeLevel,
        curriculum: data.curriculum,
        source_material: data.material.slice(0, 8000),
        source_filename: data.filename ?? null,
        bloom_distribution: dist,
      })
      .select()
      .single();
    if (setErr || !setRow) throw new Error(setErr?.message || "Gagal menyimpan set soal");

    const rows = questions.map((q, i) => ({
      set_id: setRow.id,
      user_id: userId,
      question_type: q.question_type,
      bloom_level: q.bloom_level,
      question_text: q.question_text,
      options: q.options ?? null,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      position: i,
    }));

    const { error: qErr } = await supabase.from("questions").insert(rows);
    if (qErr) throw new Error(qErr.message);

    return { setId: setRow.id as string, count: questions.length };
  });
