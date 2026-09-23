import {
  buildAnalysis,
  composeCard,
  emptyCard,
  isKnown,
  questionTarget,
  type TaskCardInput,
} from "../task-assistant.ts";
import {
  parseAnalysis,
  parseStructure,
  type DraftAnalysis,
  type TaskAnswers,
} from "./schemas.ts";
export type FallbackReason =
  | "no_key"
  | "timeout"
  | "unavailable"
  | "invalid_response";
export type AIResult<T> = {
  data: T;
  mode: "openai" | "fallback";
  reason?: FallbackReason;
};
export interface AIProvider {
  analyzeDraft(
    rawDescription: string,
    existingData: Partial<TaskCardInput>,
    signal: AbortSignal,
  ): Promise<unknown>;
  structureTask(
    rawDescription: string,
    answers: TaskAnswers,
    signal: AbortSignal,
  ): Promise<unknown>;
}
export class AIUnavailable extends Error {}
export class AIInvalidResponse extends Error {}
export function createAIService(provider?: AIProvider, timeoutMs = 20000) {
  async function call<T>(
    operation: (signal: AbortSignal) => Promise<unknown>,
    validate: (value: unknown) => T,
    fallback: () => T,
  ): Promise<AIResult<T>> {
    if (!provider)
      return { data: fallback(), mode: "fallback", reason: "no_key" };
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      const value = await Promise.race([
        Promise.resolve().then(() => operation(controller.signal)),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
            reject(new Error("AI timeout"));
          }, timeoutMs);
        }),
      ]);
      try {
        return { data: validate(value), mode: "openai" };
      } catch {
        return {
          data: fallback(),
          mode: "fallback",
          reason: "invalid_response",
        };
      }
    } catch (error) {
      return {
        data: fallback(),
        mode: "fallback",
        reason: timedOut
          ? "timeout"
          : error instanceof AIInvalidResponse
            ? "invalid_response"
            : "unavailable",
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return {
    async analyzeDraft(
      rawDescription: string,
      existingData: Partial<TaskCardInput> = {},
    ): Promise<AIResult<DraftAnalysis>> {
      const local = buildAnalysis(rawDescription, existingData);
      const fallback = () => ({
        missingFields: local.missing,
        questions: local.questions.map(({ key, question }) => ({
          key,
          question,
        })),
      });
      return call(
        (signal) =>
          provider!.analyzeDraft(rawDescription, existingData, signal),
        (value) => {
          const parsed = parseAnalysis(value);
          // A main question cannot ask again for information explicitly supplied.
          if (
            parsed.questions.some(
              (q) =>
                !local.questions.some((candidate) => candidate.key === q.key),
            )
          )
            throw new Error("Unexpected question");
          if (parsed.missingFields.some((key) => isKnown(local.card[key])))
            throw new Error("Known field marked missing");
          if (
            parsed.questions.some(
              (q) =>
                q.key === questionTarget(q.key) &&
                isKnown(local.card[q.key as keyof TaskCardInput]),
            )
          )
            throw new Error("Repeated known field");
          return parsed;
        },
        fallback,
      );
    },
    async structureTask(
      rawDescription: string,
      answers: TaskAnswers,
    ): Promise<AIResult<TaskCardInput>> {
      const knownAnswers = answers.filter((a) => isKnown(a.answer));
      const fallback = () =>
        composeCard(
          rawDescription,
          knownAnswers.map((a) => ({
            ...a,
            field: questionTarget(a.key)!,
            label: "",
            active: true,
          })),
          { ...emptyCard },
          [],
        );
      return call(
        (signal) =>
          provider!.structureTask(rawDescription, knownAnswers, signal),
        (value) => {
          const parsed = parseStructure(value, rawDescription, knownAnswers);
          const explicit = fallback();
          // Empty AI fields must not erase information already supplied by the
          // business. This adds only literal, deterministically extracted facts.
          for (const key of Object.keys(parsed) as (keyof TaskCardInput)[])
            if (!parsed[key].trim()) parsed[key] = explicit[key];
          return parsed;
        },
        fallback,
      );
    },
  };
}
