"use client";
import { PublishTaskDialog } from "./publish-task-dialog";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  FileCheck2,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { persistWizard } from "@/app/business/tasks/new/actions";
import { cardFields, type CardField } from "@/lib/task-assistant";
import { type WizardOperation, type WizardState } from "@/lib/wizard-types";
import { calculateReadiness } from "@/lib/scoring";
import { CategoryProgress, PageHeading, ReadinessBadge, ScoreBar } from "./ui";

const steps = ["Описание", "Уточнение", "Карточка", "Публикация"];
export function TaskWizard({
  initial,
  businessId,
}: {
  initial: WizardState;
  businessId: string;
}) {
  const router = useRouter();
  const heading = useRef<HTMLDivElement>(null);
  const [state, setState] = useState(initial);
  const latest = useRef(initial);
  const [busy, setBusy] = useState(false);
  const [busyOperation, setBusyOperation] = useState<WizardOperation>("save");
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "pending" | "saving" | "error"
  >("saved");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const queue = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const epoch = useRef(0);
  const storageKey = useRef(
    `qadam-wizard:${businessId}:${initial.id || "new"}`,
  );
  const mounted = useRef(true);

  function backup(value: WizardState, pending: boolean) {
    try {
      localStorage.setItem(
        storageKey.current,
        JSON.stringify({ state: value, pending }),
      );
    } catch {
      /* SQLite remains the durable source if browser storage is unavailable. */
    }
  }
  function update(next: WizardState) {
    latest.current = next;
    setState(next);
    epoch.current += 1;
    setSaveStatus("pending");
    setError("");
    backup(next, true);
    if (timer.current) clearTimeout(timer.current);
    if (next.rawDescription.trim())
      timer.current = setTimeout(() => {
        void run("save", undefined, false, false);
      }, 750);
  }
  async function run(
    operation: WizardOperation,
    targetStep?: number,
    accept = false,
    blocking = true,
  ) {
    if (blocking) {
      setBusy(true);
      setBusyOperation(operation);
      setError("");
      if (timer.current) clearTimeout(timer.current);
    }
    let success = false;
    const job = queue.current.then(async () => {
      if (!mounted.current) return;
      const capturedEpoch = epoch.current;
      const input = {
        ...latest.current,
        step: targetStep ?? latest.current.step,
      };
      setSaveStatus("saving");
      try {
        const result = await persistWizard(input, operation, accept);
        if (!result.ok) {
          setError(result.error);
          setSaveStatus("error");
          return;
        }
        const next =
          capturedEpoch === epoch.current
            ? result.state
            : {
                ...latest.current,
                id: result.state.id,
                revision: result.state.revision,
              };
        latest.current = next;
        const oldKey = storageKey.current;
        storageKey.current = `qadam-wizard:${businessId}:${next.id}`;
        if (oldKey !== storageKey.current) {
          try {
            localStorage.removeItem(oldKey);
          } catch {}
        }
        backup(next, capturedEpoch !== epoch.current);
        if (mounted.current) {
          setState(next);
          setMessage("");
          setSaveStatus(capturedEpoch === epoch.current ? "saved" : "pending");
        }
        // Replace the URL without remounting the live form or losing keystrokes.
        if (!input.id)
          window.history.replaceState(
            null,
            "",
            `/business/tasks/new?task=${next.id}`,
          );
        if (input.step !== next.step || targetStep !== undefined) {
          requestAnimationFrame(() => {
            heading.current?.scrollIntoView({ block: "start" });
            heading.current?.focus({ preventScroll: true });
          });
        }
        if (result.published) {
          try {
            localStorage.removeItem(storageKey.current);
          } catch {}
          router.push(`/tasks/${next.id}?notice=published`);
        }
        success = true;
      } catch {
        setError(
          "Не удалось связаться с сервером. Текст сохранён в этом браузере. Повторите сохранение.",
        );
        setSaveStatus("error");
      }
    });
    queue.current = job.catch(() => {});
    await job;
    if (blocking && mounted.current) setBusy(false);
    return success;
  }
  useEffect(() => {
    mounted.current = true;
    try {
      const cached = JSON.parse(
        localStorage.getItem(storageKey.current) ?? "null",
      );
      if (
        cached?.pending &&
        cached.state?.revision === initial.revision &&
        cached.state?.id === initial.id
      ) {
        const recovered: WizardState = cached.state;
        latest.current = recovered;
        // Restore a browser-only crash/reload backup after hydration.
        setState(recovered);
        setMessage(
          "Восстановлены последние несохранённые изменения из этого браузера. Нажмите «Сохранить», чтобы записать их в базу.",
        );
        setSaveStatus("pending");
      }
    } catch {
      /* A corrupt or unavailable browser backup never replaces database data. */
    }
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [initial.id, initial.revision]);

  const readiness = calculateReadiness(state.card);
  const activeQuestions = state.questions.filter((q) => q.active);
  const previousAnswers = state.questions.filter(
    (q) => !q.active && q.answer.trim(),
  );
  const changeCard = (key: CardField, value: string) =>
    update({
      ...latest.current,
      card: { ...latest.current.card, [key]: value },
      manualFields: [...new Set([...latest.current.manualFields, key])],
    });
  const answer = (key: string, value: string) =>
    update({
      ...latest.current,
      questions: latest.current.questions.map((q) =>
        q.key === key ? { ...q, answer: value } : q,
      ),
    });
  const next = () =>
    void run(
      state.step === 1 ? "analyze" : state.step === 2 ? "compose" : "preview",
    );
  return (
    <>
      <div
        ref={heading}
        tabIndex={-1}
        className="scroll-mt-24 focus:outline-none"
      >
        <PageHeading
          eyebrow="Конструктор бизнес-задачи"
          title={
            [
              "Опишите задачу",
              "Давайте уточним детали",
              "Соберите точную карточку",
              "Проверьте перед публикацией",
            ][state.step - 1]
          }
          description="От короткой идеи до понятной задачи. Вы управляете каждым шагом."
        />
      </div>
      <ol
        aria-label="Этапы создания задачи"
        className="wizard-steps"
      >
        {steps.map((label, index) => (
          <li key={label}>
            <button
              disabled={busy || index + 1 >= state.step}
              aria-current={index + 1 === state.step ? "step" : undefined}
              onClick={() => {
                            void run("save", index + 1);
              }}
              className={`wizard-step flex w-full items-center gap-2 rounded-xl border p-3 text-left text-xs font-semibold sm:gap-3 sm:p-4 ${index + 1 === state.step ? "border-violet-300 bg-violet-50 text-violet-700" : index + 1 < state.step ? "border-emerald-100 bg-white text-emerald-700" : "border-slate-200 bg-white text-slate-400"} disabled:!cursor-default disabled:!opacity-100`}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-current text-[10px]">
                {index + 1 < state.step ? <Check size={13} /> : index + 1}
              </span>
              <span className="step-label">{label}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <p role="status" className="flex items-center gap-2 text-slate-500">
          {saveStatus === "saving" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Cloud size={15} />
          )}
          {saveStatus === "saved"
            ? state.id
              ? "Все изменения сохранены"
              : "Черновик сохранится после ввода описания"
            : saveStatus === "pending"
              ? "Есть несохранённые изменения"
              : saveStatus === "saving"
                ? "Сохраняем в черновик…"
                : "Не удалось сохранить"}
        </p>
        <button
          className="btn btn-secondary"
          disabled={busy || !state.rawDescription.trim()}
          onClick={() => void run("save")}
        >
          <Save size={14} />
          Сохранить
        </button>
      </div>
      {message && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800"
        >
          {message}
          <button className="ml-3 underline" onClick={() => setMessage("")}>
            Понятно
          </button>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </div>
      )}
      <div className="sticky top-20 z-20 mb-5 rounded-xl border border-violet-100 bg-white p-3 shadow-sm xl:hidden">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold">Готовность задачи</span><ReadinessBadge score={readiness.score} /></div>
        <ScoreBar score={readiness.score} label="Текущий рейтинг" />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <section className="panel min-w-0 p-5 sm:p-7" aria-busy={busy}>
          {busy &&
            (busyOperation === "analyze" || busyOperation === "compose") && (
              <p
                role="status"
                className="mb-5 flex items-center gap-2 rounded-xl bg-violet-50 p-4 text-sm text-violet-700"
              >
                <Loader2 size={18} className="animate-spin" />
                {busyOperation === "analyze"
                  ? "Анализируем описание задачи..."
                  : "Собираем карточку из ваших ответов..."}
              </p>
            )}
          <fieldset disabled={busy} className="min-w-0">
            {state.step === 1 && (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <span className="icon-tile">
                    <Sparkles size={21} />
                  </span>
                  <div>
                    <h2 className="font-bold">Начните своими словами</h2>
                    <p className="muted mt-1 text-xs">
                      Название и детали можно будет уточнить позже.
                    </p>
                  </div>
                </div>
                <label className="field">
                  Опишите проблему или потребность
                  <textarea
                    className="input min-h-64 resize-y"
                    autoFocus
                    maxLength={8000}
                    value={state.rawDescription}
                    onChange={(e) =>
                      update({
                        ...latest.current,
                        rawDescription: e.target.value,
                      })
                    }
                    placeholder="Опишите проблему или потребность своими словами. Не обязательно подробно — мы поможем структурировать задачу."
                  />
                </label>
                <div className="mt-3 flex justify-between gap-4 text-[11px] text-slate-400">
                  <span>
                    Например: «Мы теряем клиентов интернет-магазина и хотим
                    понять почему».
                  </span>
                  <span className="shrink-0">
                    {state.rawDescription.length}/8000
                  </span>
                </div>
                {state.analyzedDescription &&
                  state.rawDescription !== state.analyzedDescription && (
                    <p className="mt-4 text-xs text-amber-700">
                      Описание изменилось. На следующем шаге обновим вопросы,
                      сохранив предыдущие ответы и ручные правки.
                    </p>
                  )}
              </>
            )}
            {state.step === 2 && (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-bold">Что ещё важно узнать</h2>
                  <p className="muted mt-2 text-sm">
                    Вопросы составлены по вашему описанию. Ответьте на то, что
                    знаете; неизвестное можно оставить пустым и заполнить позже.
                  </p>
                </div>
                <details className="mb-6 rounded-xl bg-slate-50 p-4">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                    Ваше исходное описание
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-600">
                    {state.rawDescription}
                  </p>
                </details>
                <div className="space-y-6">
                  {activeQuestions.map((q, index) => (
                    <label className="field" key={q.key}>
                      <span className="eyebrow !mb-0">
                        {index + 1}. {q.label}
                      </span>
                      <span className="text-sm font-semibold leading-relaxed text-slate-700">
                        {q.question}
                      </span>
                      <textarea
                        className="input min-h-24 resize-y"
                        aria-label={q.label}
                        maxLength={4000}
                        value={q.answer}
                        onChange={(e) => answer(q.key, e.target.value)}
                        placeholder="Ваш ответ. Если пока неизвестно — можно пропустить."
                      />
                    </label>
                  ))}
                </div>
                {previousAnswers.length > 0 && (
                  <details className="mt-6 rounded-xl border border-slate-200 p-4">
                    <summary className="cursor-pointer text-xs font-bold">
                      Ранее сохранённые ответы ({previousAnswers.length})
                    </summary>
                    <div className="mt-4 space-y-4">
                      {previousAnswers.map((q) => (
                        <label className="field" key={q.key}>
                          {q.question}
                          <textarea
                            className="input"
                            value={q.answer}
                            maxLength={4000}
                            onChange={(e) => answer(q.key, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
            {state.step === 3 && (
              <>
                <div className="mb-6 flex items-start gap-3 rounded-xl bg-violet-50 p-4">
                  <FileCheck2 size={21} className="shrink-0 text-violet-600" />
                  <p className="text-xs leading-relaxed text-violet-800">
                    Карточка собрана из вашего описания и ответов. Проверьте
                    формулировки: любой текст можно изменить. Пустые поля
                    означают, что информации пока нет.
                  </p>
                </div>
                <div className="space-y-5">
                  {cardFields.map(([key, label, max]) => (
                    <label className="field" key={key}>
                      {label}
                      {key === "title" && " *"}
                      {["title", "industry", "skills"].includes(key) ? (
                        <input
                          className="input"
                          value={state.card[key]}
                          maxLength={max}
                          onChange={(e) => changeCard(key, e.target.value)}
                          placeholder={
                            key === "skills"
                              ? "Через запятую: Python, SQL, UX-исследования"
                              : "Пока не указано"
                          }
                        />
                      ) : (
                        <textarea
                          className="input min-h-28 resize-y"
                          value={state.card[key]}
                          maxLength={max}
                          onChange={(e) => changeCard(key, e.target.value)}
                          placeholder="Пока не указано — добавьте сведения, если они известны"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}
            {state.step === 4 && (
              <>
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <span className="tag">
                    {state.card.industry || "Отрасль не указана"}
                  </span>
                  <ReadinessBadge score={readiness.score} />
                  <span className="text-xs text-slate-400">
                    Ещё не опубликована
                  </span>
                </div>
                <h2 className="mb-6 break-words text-2xl font-bold">
                  {state.card.title}
                </h2>
                <dl className="divide-y divide-slate-100">
                  {cardFields
                    .filter(([key]) => key !== "title" && key !== "industry")
                    .map(([key, label]) => (
                      <div key={key} className="py-4">
                        <dt className="mb-2 text-xs font-bold">{label}</dt>
                        <dd
                          className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${state.card[key] ? "text-slate-600" : "italic text-slate-400"}`}
                        >
                          {state.card[key] || "Пока не указано"}
                        </dd>
                      </div>
                    ))}
                </dl>
                <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
                  После публикации карточка, включая указанные контакты, будет
                  видна командам в общем каталоге. Низкий рейтинг не запрещает
                  публикацию или отклик.
                </div>

              </>
            )}
          </fieldset>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              className="btn btn-secondary"
              disabled={busy}
              onClick={async () => {
                            if (state.step > 1) await run("save", state.step - 1);
                else if (!state.rawDescription.trim() || (await run("save"))) {
                  router.push("/business/tasks");
                  router.refresh();
                }
              }}
            >
              <ArrowLeft size={14} />
              {state.step === 1 ? "К моим задачам" : "Назад"}
            </button>
            {state.step < 4 ? (
              <button
                className="btn btn-primary"
                disabled={
                  busy ||
                  !state.rawDescription.trim() ||
                  (state.step === 3 && !state.card.title.trim())
                }
                onClick={next}
              >
                {busy ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ArrowRight size={15} />
                )}
                {busy
                  ? "Сохраняем…"
                  : [
                      "Получить уточняющие вопросы",
                      "Сформировать карточку",
                      "Предварительный просмотр",
                    ][state.step - 1]}
              </button>
            ) : (
              <PublishTaskDialog card={state.card} disabled={busy} onConfirm={() => run("publish", 4, true)} />
            )}
          </div>
        </section>
        <aside className="space-y-5 xl:sticky xl:top-24">
          <section className="panel readiness-panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Готовность задачи</h2>
              <ReadinessBadge score={readiness.score} />
            </div>
            <div aria-live="polite" aria-atomic="true"><ScoreBar score={readiness.score} prominent /></div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Оцениваем заполненность, а не стиль текста. Пусто или неизвестно —
              0; кратко — половина; 4 разных слова и 20 знаков без пробелов —
              полный балл. Дробные баллы округляются вниз.
            </p>
            {state.maxStep >= 2 && (
              <p className="mt-3 text-xs text-slate-500">
                Было после описания: {state.baselineScore} / 100
                {readiness.score > state.baselineScore && (
                  <strong className="ml-2 text-emerald-600">
                    +{readiness.score - state.baselineScore} баллов
                  </strong>
                )}
              </p>
            )}
            <div className="mt-6 space-y-4">
              {readiness.breakdown.map((item) => (
                <div key={item.label}>
                  <CategoryProgress label={item.label} score={item.points} max={item.max} />
                  {item.missingFields.length > 0 && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {item.missing.join(". ")} {item.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
          <div className="flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
            <ShieldCheck size={22} className="shrink-0 text-emerald-600" />
            <p className="text-xs leading-relaxed text-emerald-800">
              Сейчас это личный черновик бизнеса. Публикация произойдёт только
              после вашей проверки и подтверждения на последнем шаге.
            </p>
          </div>
          <p
            role="status"
            className="rounded-xl bg-violet-50 p-4 text-xs leading-relaxed text-violet-800"
          >
            {state.aiMode === "openai"
              ? "Карточку помогает подготовить AI. Проверьте все формулировки: каждое поле можно изменить перед публикацией."
              : state.aiMode === "fallback"
                ? state.aiReason === "no_key"
                  ? "Работает встроенный помощник без API. Все шаги доступны; сведения можно редактировать вручную."
                  : state.aiReason === "timeout"
                    ? "AI не ответил вовремя. Продолжаем со встроенным помощником — ваши данные сохранены. Все поля можно редактировать."
                    : "AI временно недоступен или вернул некорректный ответ. Продолжаем со встроенным помощником. Проверьте и отредактируйте карточку."
                : "AI поможет уточнить задачу и собрать карточку. Если сервис недоступен, автоматически включится встроенный помощник. Не вводите чувствительные данные."}
          </p>
        </aside>
      </div>
    </>
  );
}
