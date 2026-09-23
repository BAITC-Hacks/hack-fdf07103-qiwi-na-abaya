"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { calculateReadiness } from "@/lib/scoring";
import {
  cardFields,
  questionTarget,
  composeCard,
  type CardField,
} from "@/lib/task-assistant";
import { analyzeDraft, structureTask } from "@/lib/ai/server";
import { taskToWizard } from "@/lib/wizard-storage";
import {
  newWizard,
  type WizardOperation,
  type WizardResult,
  type WizardState,
} from "@/lib/wizard-types";

function validate(input: WizardState) {
  if (
    !input ||
    typeof input.rawDescription !== "string" ||
    !input.card ||
    !Array.isArray(input.questions) ||
    !Array.isArray(input.manualFields)
  )
    throw new Error("Некорректные данные формы.");
  if (!input.rawDescription.trim())
    throw new Error("Добавьте хотя бы короткое описание задачи.");
  if (input.rawDescription.length > 8000 || input.questions.length > 30)
    throw new Error("Описание слишком длинное. Максимум — 8000 символов.");
  for (const [key, label, max] of cardFields)
    if (typeof input.card[key] !== "string" || input.card[key].length > max)
      throw new Error(`Поле «${label}»: максимум ${max} символов.`);
  for (const q of input.questions)
    if (
      typeof q.key !== "string" ||
      typeof q.answer !== "string" ||
      q.answer.length > 4000
    )
      throw new Error("Ответ должен быть короче 4000 символов.");
  if (
    !Number.isInteger(input.revision) ||
    !Number.isInteger(input.step) ||
    input.step < 1 ||
    input.step > 4
  )
    throw new Error("Некорректный шаг конструктора.");
}
export async function persistWizard(
  input: WizardState,
  operation: WizardOperation,
  confirmed = false,
): Promise<WizardResult> {
  try {
    if (
      !(
        ["save", "analyze", "compose", "preview", "publish"] as string[]
      ).includes(operation)
    )
      throw new Error("Неизвестное действие.");
    validate(input);
    if ((await cookies()).get("qadam-role")?.value === "team")
      throw new Error(
        "Создавать и публиковать задачи может только бизнес. Переключите роль.",
      );
    const business = await db.business.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (!business) throw new Error("Не найден бизнес-профиль.");
    const stored = input.id
      ? await db.task.findUnique({
          where: { id: input.id },
          include: { clarifications: { orderBy: { position: "asc" } } },
        })
      : null;
    if (input.id && (!stored || stored.businessId !== business.id))
      throw new Error("Черновик не найден или недоступен.");
    if (stored?.status !== undefined && stored.status !== "DRAFT")
      throw new Error("Эта задача уже опубликована. Откройте её карточку.");
    if (stored && stored.wizardRevision !== input.revision)
      throw new Error(
        "Черновик изменён в другой вкладке. Обновите страницу перед продолжением; локальный текст сохранён в браузере.",
      );
    const previous = stored ? taskToWizard(stored) : newWizard();
    const manualFields = [
      ...new Set(
        input.manualFields.filter((key): key is CardField =>
          cardFields.some(([field]) => field === key),
        ),
      ),
    ];
    const state: WizardState = {
      ...previous,
      rawDescription: input.rawDescription,
      card: { ...input.card },
      manualFields,
      step: Math.min(input.step, previous.maxStep),
    };
    state.questions = previous.questions.map((q) => ({
      ...q,
      answer:
        input.questions.find((item) => item.key === q.key)?.answer ?? q.answer,
    }));
    if (operation === "analyze") {
      if (
        state.analyzedDescription !== state.rawDescription ||
        state.questions.filter((q) => q.active).length < 3
      ) {
        const composed = composeCard(
          state.rawDescription,
          state.questions,
          state.card,
          state.manualFields,
        );
        const result = await analyzeDraft(state.rawDescription, composed);
        state.aiMode = result.mode;
        state.aiReason = result.reason ?? "";
        const questions = result.data.questions.map((q) => ({
          ...q,
          field: questionTarget(q.key)!,
          label: cardFields.find(([key]) => key === questionTarget(q.key))![1],
          answer: "",
          active: true,
        }));
        state.card = composed;
        state.questions = state.questions.map((q) => ({ ...q, active: false }));
        for (const question of questions) {
          const existing = state.questions.find((q) => q.key === question.key);
          if (existing) {
            existing.question = question.question;
            existing.active = true;
          } else state.questions.push(question);
        }
        state.analyzedDescription = state.rawDescription;
        if (previous.maxStep < 2)
          state.baselineScore = calculateReadiness(state.card).score;
      }
      state.step = 2;
      state.maxStep = Math.max(previous.maxStep, 2);
    }
    if (
      operation === "compose" ||
      operation === "preview" ||
      operation === "publish"
    ) {
      if (
        state.rawDescription !== previous.analyzedDescription ||
        previous.questions.filter((q) => q.active).length < 3
      )
        throw new Error(
          "Описание изменилось. Вернитесь к первому шагу и обновите уточняющие вопросы.",
        );
      if (operation === "compose") {
        const result = await structureTask(
          state.rawDescription,
          state.questions.map(({ key, question, answer }) => ({
            key,
            question,
            answer,
          })),
        );
        const generated = result.data;
        for (const key of state.manualFields) generated[key] = state.card[key];
        state.card = generated;
        state.aiMode = result.mode;
        state.aiReason = result.reason ?? "";
        state.step = 3;
        state.maxStep = Math.max(previous.maxStep, 3);
      } else {
        if (previous.maxStep < 3 || !state.card.title.trim())
          throw new Error("Сначала сформируйте карточку и укажите название.");
        if (operation === "preview") {
          state.step = 4;
          state.maxStep = 4;
        } else if (!confirmed || previous.step !== 4)
          throw new Error(
            "Просмотрите карточку и подтвердите сведения перед публикацией.",
          );
      }
    }
    validate(state);
    const { score, readinessLevel } = calculateReadiness(state.card);
    const meta = {
      aiMode: state.aiMode,
      aiReason: state.aiReason,
      step: state.step,
      maxStep: state.maxStep,
      analyzedDescription: state.analyzedDescription,
      baselineScore: state.baselineScore,
      manualFields: state.manualFields,
      activeKeys: state.questions.filter((q) => q.active).map((q) => q.key),
    };
    const publishing = operation === "publish";
    const data = {
      ...state.card,
      title:
        state.card.title.trim() || state.rawDescription.trim().slice(0, 150),
      skills: [
        ...new Set(
          state.card.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ],
      rawDescription: state.rawDescription,
      score,
      readinessLevel,
      wizardState: meta,
      ...(publishing
        ? {
            status: "PUBLISHED" as const,
            confirmedAt: new Date(),
            publishedAt: new Date(),
          }
        : {}),
    };
    const saved = await db.$transaction(async (tx) => {
      let id = stored?.id;
      if (stored) {
        const updated = await tx.task.updateMany({
          where: {
            id: stored.id,
            businessId: business.id,
            wizardRevision: input.revision,
            status: "DRAFT",
          },
          data: { ...data, wizardRevision: { increment: 1 } },
        });
        if (!updated.count)
          throw new Error(
            "Черновик уже изменён. Обновите страницу перед продолжением.",
          );
      } else {
        const created = await tx.task.create({
          data: { ...data, businessId: business.id, wizardRevision: 1 },
        });
        id = created.id;
      }
      for (const [position, q] of state.questions.entries())
        await tx.clarification.upsert({
          where: { taskId_position: { taskId: id!, position } },
          create: {
            taskId: id!,
            field: q.key,
            question: q.question,
            answer: q.answer,
            position,
          },
          update: { field: q.key, question: q.question, answer: q.answer },
        });
      return tx.task.findUniqueOrThrow({
        where: { id },
        include: { clarifications: { orderBy: { position: "asc" } } },
      });
    });
    // Autosaves must not remount the wizard; transitions refresh data when navigation occurs.
    if (publishing) {
      revalidatePath("/catalog");
      revalidatePath("/tasks");
      revalidatePath("/business");
      revalidatePath("/business/tasks");
    }
    return { ok: true, state: taskToWizard(saved), published: publishing };
  } catch (error) {
    console.error("Wizard operation failed:", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Не удалось сохранить. Попробуйте ещё раз.",
    };
  }
}
