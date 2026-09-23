import type { Prisma, Task, Clarification } from "@prisma/client";
import {
  cardFields,
  questionTarget,
  type TaskCardInput,
  type CardField,
} from "./task-assistant";
import { newWizard, type WizardState } from "./wizard-types";
import { tags } from "./presentation";

export function taskToWizard(
  task: Task & { clarifications: Clarification[] },
): WizardState {
  const base = newWizard();
  const meta =
    task.wizardState &&
    typeof task.wizardState === "object" &&
    !Array.isArray(task.wizardState)
      ? (task.wizardState as Prisma.JsonObject)
      : {};
  const active = Array.isArray(meta.activeKeys)
    ? meta.activeKeys
    : task.clarifications.map((q) => q.field);
  const card = Object.fromEntries(
    cardFields.map(([key]) => [
      key,
      key === "skills" ? tags(task.skills).join(", ") : task[key],
    ]),
  ) as TaskCardInput;
  return {
    ...base,
    id: task.id,
    revision: task.wizardRevision,
    rawDescription: task.rawDescription,
    card,
    step: typeof meta.step === "number" ? meta.step : 1,
    maxStep: typeof meta.maxStep === "number" ? meta.maxStep : 1,
    analyzedDescription:
      typeof meta.analyzedDescription === "string"
        ? meta.analyzedDescription
        : "",
    baselineScore:
      typeof meta.baselineScore === "number" ? meta.baselineScore : task.score,
    manualFields: Array.isArray(meta.manualFields)
      ? meta.manualFields.filter((key): key is CardField =>
          cardFields.some(([field]) => field === key),
        )
      : cardFields.filter(([key]) => card[key].trim()).map(([key]) => key),
    questions: task.clarifications
      .filter((q) => questionTarget(q.field))
      .map((q) => ({
        key: q.field,
        field: questionTarget(q.field)!,
        label: cardFields.find(([key]) => key === questionTarget(q.field))![1],
        question: q.question,
        answer: q.answer,
        active: active.includes(q.field),
      })),
  };
}
