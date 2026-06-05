import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const QuestionSchema = z.object({
  id: z.string().uuid(),
  setId: z.string().uuid(),
});

const UpdateQuestionSchema = QuestionSchema.extend({
  questionText: z.string().min(1).max(4000),
  options: z.array(z.string().min(1).max(500)).nullable().optional(),
  correctAnswer: z.string().min(1).max(2000),
  explanation: z.string().min(1).max(4000),
});

async function ensureOwnership(supabase: any, userId: string, setId: string, questionId?: string) {
  const { data: setRow, error: setError } = await supabase
    .from("question_sets")
    .select("id,user_id,source_material,subject,grade_level,curriculum")
    .eq("id", setId)
    .eq("user_id", userId)
    .single();

  if (setError || !setRow) throw new Error("Set soal tidak ditemukan.");

  if (questionId) {
    const { data: questionRow, error: questionError } = await supabase
      .from("questions")
      .select("id,set_id,user_id,question_type,bloom_level,position")
      .eq("id", questionId)
      .eq("set_id", setId)
      .eq("user_id", userId)
      .single();

    if (questionError || !questionRow) throw new Error("Soal tidak ditemukan.");
    return { setRow, questionRow };
  }

  return { setRow };
}

function sanitizeOptions(options: string[] | null | undefined) {
  if (!options) return null;
  const cleaned = options.map((item) => item.trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

export const updateQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateQuestionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureOwnership(supabase, userId, data.setId, data.id);

    const options = sanitizeOptions(data.options);
    const { error } = await supabase
      .from("questions")
      .update({
        question_text: data.questionText.trim(),
        options,
        correct_answer: data.correctAnswer.trim(),
        explanation: data.explanation.trim(),
      })
      .eq("id", data.id)
      .eq("set_id", data.setId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const regenerateQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => QuestionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY belum dikonfigurasi");

    const { setRow, questionRow } = await ensureOwnership(supabase, userId, data.setId, data.id);

    const prompt = `Anda adalah ahli pedagogi dan penyusun soal HOTS untuk kurikulum Indonesia.

TUGAS:
- Regenerasi SATU soal saja.
- Pertahankan tipe soal: ${questionRow.question_type}
- Pertahankan level Bloom: ${questionRow.bloom_level}
- Materi: ${setRow.subject ?? "-"}
- Jenjang: ${setRow.grade_level ?? "-"}
- Kurikulum: ${setRow.curriculum ?? "-"}

SUMBER MATERI:
"""
${(setRow.source_material ?? "").slice(0, 8000)}
"""

ATURAN:
1. Hasil harus berbeda dari versi sebelumnya namun tetap relevan dengan materi.
2. Jika tipe multiple_choice, berikan 4 opsi tanpa prefiks huruf dan correct_answer berupa huruf A/B/C/D.
3. Jika tipe true_false, options = null dan correct_answer = Benar/Salah.
4. Jika tipe essay, options = null.
5. Kembalikan HANYA JSON valid berbentuk object dengan keys: question_type, bloom_level, question_text, options, correct_answer, explanation.`;

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 300)}`);
    }

    const payload = await res.json();
    const text = payload?.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => part.text)?.text;
    if (!text) throw new Error("AI tidak mengembalikan data regenerasi yang valid.");

    let parsed: {
      question_type: string;
      bloom_level: string;
      question_text: string;
      options?: string[] | null;
      correct_answer: string;
      explanation: string;
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("Respons AI tidak dapat dibaca.");
    }

    const { error } = await supabase
      .from("questions")
      .update({
        question_text: parsed.question_text?.trim(),
        options: sanitizeOptions(parsed.options),
        correct_answer: parsed.correct_answer?.trim(),
        explanation: parsed.explanation?.trim(),
      })
      .eq("id", data.id)
      .eq("set_id", data.setId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    return {
      ok: true,
      question: {
        id: data.id,
        question_text: parsed.question_text?.trim(),
        options: sanitizeOptions(parsed.options),
        correct_answer: parsed.correct_answer?.trim(),
        explanation: parsed.explanation?.trim(),
      },
    };
  });

export const ensureDemoAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: z.string().email(), password: z.string().min(6), fullName: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = existing?.users?.find((user) => user.email?.toLowerCase() === data.email.toLowerCase());

    if (!found) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
      });

      if (createError) throw new Error(createError.message);

      if (created.user) {
        await supabaseAdmin.from("profiles").upsert({ id: created.user.id, full_name: data.fullName });
      }
    }

    return { ok: true };
  });