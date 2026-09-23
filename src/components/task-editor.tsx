"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Save, Sparkles, Loader2 } from "lucide-react";
import { cardFields, type CardField, type TaskCardInput } from "@/lib/task-assistant";
import { calculateReadiness, readinessLabels } from "@/lib/scoring";
import { PageHeading, ReadinessBadge, ScoreBar } from "./ui";
import { updateTask } from "@/app/business/tasks/[id]/edit/actions";

export function TaskEditor({ id, initialCard, initialRevision }: { id: string; initialCard: TaskCardInput; initialRevision: number }) {
  const [card, setCard] = useState(initialCard);
  const [savedCard, setSavedCard] = useState(initialCard);
  const [revision, setRevision] = useState(initialRevision);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [highlight, setHighlight] = useState<CardField | null>(null);
  const [pending, startTransition] = useTransition();
  const fields = useRef<Partial<Record<CardField, HTMLInputElement | HTMLTextAreaElement>>>({});
  const baseline = calculateReadiness(initialCard);
  const readiness = calculateReadiness(card);
  const dirty = JSON.stringify(card) !== JSON.stringify(savedCard);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function improve() {
    const first = readiness.categories.flatMap(category => category.missingFields)[0];
    if (!first) return;
    setHighlight(first);
    fields.current[first]?.scrollIntoView({ block: "center", behavior: "instant" });
    fields.current[first]?.focus({ preventScroll: true });
  }
  return <>
    <PageHeading eyebrow="Рабочее пространство бизнеса" title="Редактирование задачи" description="Дополните карточку: готовность пересчитывается сразу. Сохранение не меняет статус публикации и решения по командам." action={<Link className="btn btn-secondary" href={`/tasks/${id}`}>Карточка задачи</Link>} />
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <aside className="order-first min-w-0 lg:order-last lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto" aria-label="Готовность задачи">
        <section className="panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Готовность задачи</h2><ReadinessBadge score={readiness.total} /></div>
          <p className="mb-3 text-4xl font-bold tabular-nums text-violet-700">{readiness.total}<span className="text-lg font-normal text-slate-400"> / 100</span></p>
          <ScoreBar score={readiness.total} />
          <div aria-live="polite" aria-atomic="true" className="mt-3 text-xs leading-relaxed text-emerald-700">
            {readiness.total > baseline.total && <p className="font-bold">+{readiness.total - baseline.total} баллов с начала редактирования</p>}
            {readiness.total > baseline.total && readiness.level !== baseline.level && <p>Уровень повышен: {readinessLabels[baseline.level]} → {readinessLabels[readiness.level]}</p>}
          </div>
          <button type="button" className="btn btn-secondary my-4 w-full" disabled={!readiness.suggestions.length} onClick={improve}><Sparkles size={16} />Улучшить задачу</button>
          {!readiness.suggestions.length && <p className="mb-4 text-xs text-emerald-700">Все категории заполнены.</p>}
          <div className="space-y-4">
            {readiness.categories.map(category => <div key={category.key}>
              <div className="flex justify-between gap-3 text-xs"><span>{category.label}</span><strong className="shrink-0">{category.score} / {category.maxScore}</strong></div>
              {category.missing.length > 0 && <><p className="mt-1 text-xs text-slate-500">{category.missing.join(". ")}</p><p className="mt-1 text-xs text-violet-700">{category.hint}</p></>}
            </div>)}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-slate-400">Оцениваем заполненность, а не стиль текста. Низкий рейтинг не запрещает публикацию и отклики.</p>
        </section>
      </aside>
      <form className="min-w-0" onSubmit={event => {
        event.preventDefault(); setError(""); setMessage("");
        startTransition(async () => {
          try {
            const result = await updateTask({ id, revision, card });
            if (!result.ok) { setError(result.error); return; }
            setCard(result.card); setSavedCard(result.card); setRevision(result.revision);
            setMessage(`Задача сохранена. Готовность: ${result.score} / 100. Рейтинг пересчитан на сервере.`);
          } catch { setError("Связь прервалась. Правки остались в форме. Попробуйте сохранить снова."); }
        });
      }}>
        <div className="sticky top-20 z-20 mb-4 rounded-xl border border-violet-100 bg-white p-3 shadow-sm lg:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><strong>Готовность задачи · {readiness.total} / 100</strong><ReadinessBadge score={readiness.total} /></div>
          <div className="mt-2 h-1 rounded-full bg-violet-100"><div className="h-full rounded-full bg-violet-600" style={{ width: `${readiness.total}%` }} /></div>
          {readiness.total > baseline.total && <p className="mt-2 text-xs text-emerald-700">+{readiness.total - baseline.total} баллов{readiness.level !== baseline.level ? ` · Уровень повышен: ${readinessLabels[baseline.level]} → ${readinessLabels[readiness.level]}` : ""}</p>}
        </div>
        <fieldset disabled={pending} className="panel min-w-0 space-y-5 p-5 sm:p-6">
          {cardFields.map(([key, label, max]) => <label key={key} className={`field scroll-mt-28 rounded-xl ${highlight === key ? "bg-violet-50 p-3 ring-2 ring-violet-400" : ""}`}>
            {label}{key === "title" ? " *" : ""}{key === "skills" ? " · через запятую" : ""}
            {["title", "industry", "skills"].includes(key) ? <input ref={element => { if (element) fields.current[key] = element; }} className="input" name={key} value={card[key]} maxLength={max} required={key === "title"} onChange={event => { setCard({ ...card, [key]: event.target.value }); setMessage(""); }} /> : <textarea ref={element => { if (element) fields.current[key] = element; }} className="input min-h-28" name={key} value={card[key]} maxLength={max} onChange={event => { setCard({ ...card, [key]: event.target.value }); setMessage(""); }} />}
          </label>)}
        </fieldset>
        <div className="sticky bottom-3 z-10 mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {error && <p role="alert" className="mb-3 text-sm text-rose-700">{error}</p>}
          {message && <p role="status" className="mb-3 text-sm text-emerald-700">{message}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}</p><button type="submit" className="btn btn-primary" disabled={pending}>{pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{pending ? "Сохраняем…" : "Сохранить изменения"}</button></div>
        </div>
      </form>
    </div>
  </>;
}
