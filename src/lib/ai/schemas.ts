import { z } from "zod";
import {
  cardFields,
  extraQuestions,
  questionTarget,
  isKnown,
  extractEvidence,
  type CardField,
  type TaskCardInput,
} from "../task-assistant.ts";
export const fieldNames = cardFields.map(([key]) => key);
export const questionKeys = [
  ...fieldNames.filter((key) => questionTarget(key)),
  ...Object.keys(extraQuestions),
  "refinementScope",
  "refinementDemo",
  "refinementFeedback",
];
const strings = Object.fromEntries(
  cardFields.map(([key, , max]) => [key, z.string().max(max)]),
) as Record<CardField, z.ZodString>;
export const cardSchema = z.strictObject(strings);
export const analysisSchema = z.strictObject({
  missingFields: z.array(z.enum(fieldNames)).max(12),
  questions: z
    .array(
      z.strictObject({
        key: z.enum(questionKeys),
        question: z.string().trim().min(12).max(600),
      }),
    )
    .min(3)
    .max(12),
});
// Evidence is internal to the provider response, never part of the editable card.
export const structureSchema = z.strictObject({
  evidence: z.strictObject(
    Object.fromEntries(
      fieldNames.map((key) => [key, z.string().max(8000).describe(
        key === "title"
          ? "Copy rawDescription verbatim here, never the generated title."
          : "Exact continuous quote from the user's description or answer for this field; empty if unknown.",
      )]),
    ) as Record<CardField, z.ZodString>,
  ),
  card: cardSchema,
});
export type DraftAnalysis = z.infer<typeof analysisSchema>;
export type TaskAnswers = { key: string; question: string; answer: string }[];
export function parseAnalysis(value: unknown): DraftAnalysis {
  const result = analysisSchema.parse(value);
  if (
    result.questions.some((q) =>
      /парол|паспорт|иин|снилс|секретн|api.?key|номер.*карт|(?:пришлите|укажите|назовите).*личн.*(?:телефон|адрес|контакт)/iu.test(
        q.question,
      ),
    )
  )
    throw new Error("Sensitive question");
  if (
    new Set(result.questions.map((q) => q.key)).size !==
      result.questions.length ||
    new Set(result.questions.map((q) => q.question.toLocaleLowerCase()))
      .size !== result.questions.length ||
    new Set(result.missingFields).size !== result.missingFields.length
  )
    throw new Error("Duplicate AI fields");
  return result;
}
const normalized = (value: string) =>
  value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
export function parseStructure(
  value: unknown,
  raw: string,
  answers: TaskAnswers,
): TaskCardInput {
  const result = structureSchema.parse(value);
  const sources = [raw, ...answers.map((a) => a.answer)].map(normalized);
  const rawFields = extractEvidence(raw);
  const card = { ...result.card };
  for (const key of fieldNames) {
    const quote = normalized(result.evidence[key]);
    if (
      result.card[key].trim() &&
      (!isKnown(quote) || !sources.some((source) => source.includes(quote)))
    )
      throw new Error(`Unsupported AI field: ${key}`);
    if (!card[key].trim() || key === "title") continue;
    const fieldSources = [
      rawFields[key],
      ...answers.filter((answer) => questionTarget(answer.key) === key)
        .map((answer) => answer.answer),
    ].filter(isKnown).map(normalized);
    if (!fieldSources.some((source) => source.includes(quote)))
      throw new Error(`Unrelated AI evidence: ${key}`);
    // A valid quote does not prove an AI paraphrase. Keep the verified user
    // wording for factual fields so quantities, commitments and contacts cannot
    // be invented alongside real evidence. The business can edit every field.
    card[key] = result.evidence[key].trim();
  }
  return cardSchema.parse(card);
}
