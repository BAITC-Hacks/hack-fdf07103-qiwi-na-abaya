import {
  emptyCard,
  type TaskCardInput,
  type Question,
  type CardField,
} from "./task-assistant.ts";
export type WizardState = {
  id: string;
  revision: number;
  step: number;
  maxStep: number;
  rawDescription: string;
  analyzedDescription: string;
  card: TaskCardInput;
  manualFields: CardField[];
  questions: Question[];
  baselineScore: number;
  aiMode: "idle" | "openai" | "fallback";
  aiReason: string;
};
export type WizardOperation =
  | "save"
  | "analyze"
  | "compose"
  | "preview"
  | "publish";
export type WizardResult =
  | { ok: true; state: WizardState; published?: boolean }
  | { ok: false; error: string };
export function newWizard(): WizardState {
  return {
    id: "",
    revision: 0,
    step: 1,
    maxStep: 1,
    rawDescription: "",
    analyzedDescription: "",
    card: { ...emptyCard },
    manualFields: [],
    questions: [],
    baselineScore: 0,
    aiMode: "idle",
    aiReason: "",
  };
}
