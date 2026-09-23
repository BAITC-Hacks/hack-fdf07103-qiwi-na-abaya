import "server-only";
import { createAIService } from "./service.ts";
import { createOpenAIProvider } from "./openai.ts";
import type { TaskCardInput } from "../task-assistant.ts";
import type { TaskAnswers } from "./schemas.ts";
function service() {
  const key = process.env.AI_API_KEY?.trim();
  return createAIService(
    key
      ? createOpenAIProvider(key, process.env.AI_MODEL?.trim() || "gpt-4o-mini")
      : undefined,
  );
}
export const analyzeDraft = (
  rawDescription: string,
  existingData: Partial<TaskCardInput> = {},
) => service().analyzeDraft(rawDescription, existingData);
export const structureTask = (rawDescription: string, answers: TaskAnswers) =>
  service().structureTask(rawDescription, answers);
